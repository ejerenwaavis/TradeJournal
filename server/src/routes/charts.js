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

WHAT TO LOOK FOR:
- Instrument/ticker: shown top-left of chart (e.g. MNQ1!, ES1!, NQ1!, EURUSD, GBPUSD, BTCUSDT)
- Timeframe: shown next to the ticker (1, 3, 5, 15, 1H, 4H, 1D, 1W)
- Trade direction: arrows, entry markers, colored boxes/labels. Green/bullish = long, Red/bearish = short
- Price levels: read the RIGHT-SIDE price axis. Entry, SL, and TP lines are often horizontal dashed/solid lines with price labels
- ICT/SMC structures: Order Blocks (OB) = colored rectangles; Fair Value Gaps (FVG) = gaps between candles often highlighted; BOS/ChoCH/MSS = structural break labels on the chart
- Session: time-based shading, background color bands, or text labels (London, NY, Asian, Overlap)

ASSET CLASS RULES (critical — do not guess):
- MNQ, NQ, ES, YM, RTY, MES, MYM (US index futures) → "stocks"
- EUR/USD, GBP/JPY, AUD/CAD and other forex pairs → "forex"
- BTC, ETH, SOL and other crypto → "crypto"
- GC (Gold), CL (Oil), SI (Silver) → "commodities"
- If unknown, use null

Respond ONLY with valid JSON — no markdown fences, no text outside the JSON object:
{
  "instrument": "ticker string or null",
  "assetClass": "forex|stocks|crypto|commodities|null",
  "direction": "long|short|null",
  "timeframe": "1M|3M|5M|15M|1H|4H|D|W|null",
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit1": number or null,
  "takeProfit2": number or null,
  "setupType": "describe the setup pattern visible (e.g. FVG, OB, BOS+MSS, ChoCH+OB, Liquidity Sweep) or null",
  "confluences": ["list every confluence you can identify from the chart"],
  "session": "London|NY|Asian|London/NY Overlap|null",
  "notes": "one concise sentence about the key context or trade narrative visible on the chart, or null"
}`;

async function analyzeImageUrl(imageUrl) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1200,
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
    return { parsed: JSON.parse(raw), raw };
  } catch {
    // GPT occasionally wraps in ```json ... ```
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return { parsed: JSON.parse(match[0]), raw };
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
