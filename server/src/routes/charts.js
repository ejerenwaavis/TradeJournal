const router = require('express').Router();
const auth = require('../middleware/auth');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer storage for fallback screenshot uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${path.basename(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Strict SSRF guard — only allow TradingView snapshot links
const TV_LINK_RE = /^https:\/\/www\.tradingview\.com\/x\/[a-zA-Z0-9]+\/?$/;

const CHART_PROMPT = `You are an expert ICT (Inner Circle Trader) / SMC (Smart Money Concepts) trading analyst. Carefully study this chart screenshot and extract all visible trade information.

== PRICE NOTE LABELS — HIGHEST PRIORITY ==
Look for small BLACK or RED pill/bubble shaped labels with a short horizontal line pointing to a price level on the right-side axis. These are the most important elements on the chart. They are typically labeled:
  "Entry" or "entry" — the trade entry price
  "Stop Loss", "SL", "stop loss" — the stop loss price
  "Take Profit", "TP", "TP1", "TP 1", "Take Profit 1" — first target
  "Take Profit 2", "TP2", "TP 2" — second target (if present)
Read the EXACT numeric price value printed inside or next to each bubble. These override any other price levels you see.

== OTHER THINGS TO LOOK FOR ==
- Instrument/ticker: shown top-left (e.g. MNQH2026, MNQ1!, ES1!, EURUSD)
- Timeframe: shown next to ticker (1, 3, 5, 15, 1H, 4H, 1D)
- Direction: stoploss below entry/green/upward = long, stoploss above entry/red/downward = short
- ICT/SMC structures: Order Blocks (colored rectangles), FVG (highlighted gaps between candles), BOS/CHoCH/MSS labels, liquidity sweeps
- Session labels or shaded time zones (London, NY Open, Asian)

== ASSET CLASS RULES (never guess) ==
- MNQ, NQ, MES, ES, YM, MYM, RTY (US index futures) → "stocks"
- EUR/USD, GBP/JPY, AUD/CAD and all forex pairs → "forex"
- BTC, ETH, SOL and crypto → "crypto"
- GC (Gold), CL (Oil), SI (Silver) → "commodities"
- Unknown → null

== HANDLES / POINTS CALCULATION ==
After extracting entryPrice, stopLoss, takeProfit1:
- For LONG trades:
    pnlPips = takeProfit1 - entryPrice  (positive = gain)
    riskPips = entryPrice - stopLoss
- For SHORT trades:
    pnlPips = entryPrice - takeProfit1  (positive = gain)
    riskPips = stopLoss - entryPrice
- riskReward = pnlPips / riskPips  (round to 2 decimal places)
If you cannot determine direction or prices, set pnlPips and riskReward to null.

== SESSION MAPPING ==
Map what you see to one of these exact strings:
"NY Premarket" (7:00–9:30 AM ET) | "NY Open" (9:30–11:30 AM ET) | "NY Lunch" (11:30 AM–1:30 PM ET) | "NY PM" (1:30–4:15 PM ET) | "London" (1:30–4:30 AM ET) | "Asian"

Respond ONLY with valid JSON — no markdown fences, no extra text:
{
  "instrument": "ticker or null",
  "assetClass": "forex|stocks|crypto|commodities|null",
  "direction": "long|short|null",
  "timeframe": "1M|3M|5M|15M|1H|4H|D|W|null",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit1": number or null,
  "takeProfit2": number or null,
  "pnlPips": number or null,
  "riskReward": number or null,
  "setupType": "setup pattern (e.g. FVG, OB, BOS+MSS, ChoCH+OB, Liquidity Sweep) or null",
  "confluences": ["every ICT/SMC confluence visible"],
  "session": "NY Premarket|NY Open|NY Lunch|NY PM|London|Asian|null",
  "notes": "one concise sentence about the trade narrative, or null"
}`;

// Compute pnlPips / riskReward server-side as a fallback
function calcHandles(parsed) {
  const { entryPrice, stopLoss, takeProfit1, direction } = parsed;
  if (!entryPrice || !takeProfit1 || !direction) return parsed;
  const isLong = direction === 'long';
  const pnlPips = parsed.pnlPips != null ? parsed.pnlPips
    : parseFloat((isLong ? takeProfit1 - entryPrice : entryPrice - takeProfit1).toFixed(2));
  const riskPips = stopLoss ? Math.abs(entryPrice - stopLoss) : null;
  const riskReward = parsed.riskReward != null ? parsed.riskReward
    : (riskPips && riskPips > 0 ? parseFloat((pnlPips / riskPips).toFixed(2)) : null);
  return { ...parsed, pnlPips, riskReward };
}

async function analyzeImageUrl(imageUrl) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          { type: 'text', text: CHART_PROMPT },
        ],
      },
    ],
  });

  const raw = response.choices[0].message.content.trim();
  try {
    const parsed = JSON.parse(raw);
    return { parsed: calcHandles(parsed), raw };
  } catch {
    // GPT occasionally wraps in ```json ... ```
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { parsed: calcHandles(parsed), raw };
    }
    return { parsed: null, raw };
  }
}

// POST /api/charts/analyze  — body: { tvLink }
router.post('/analyze', auth, async (req, res) => {
  const { tvLink } = req.body;
  if (!tvLink) return res.status(400).json({ error: 'tvLink is required' });
  if (!TV_LINK_RE.test(tvLink)) {
    return res.status(400).json({ error: 'Invalid TradingView snapshot URL' });
  }

  try {
    // Fetch the TradingView snapshot page to extract og:image
    const pageRes = await axios.get(tvLink, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TradeJournalBot/1.0)' },
      timeout: 10000,
      maxRedirects: 3,
    });

    // Extract og:image using a simple regex on the HTML (avoids loading cheerio for one tag)
    const ogMatch = pageRes.data.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || pageRes.data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (!ogMatch) return res.status(422).json({ error: 'Could not extract chart image from TradingView page' });

    const imageUrl = ogMatch[1];
    const { parsed, raw } = await analyzeImageUrl(imageUrl);

    res.json({ imageUrl, parsed, raw });
  } catch (err) {
    if (err.response) {
      return res.status(502).json({ error: `TradingView fetch failed: ${err.response.status}` });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/charts/analyze-upload  — multipart: file
router.post('/analyze-upload', auth, upload.single('chart'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

  try {
    const fileData = fs.readFileSync(req.file.path);
    const base64 = fileData.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const { parsed, raw } = await analyzeImageUrl(dataUrl);
    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({ imageUrl, parsed, raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
