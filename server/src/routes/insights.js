const router = require('express').Router();
const auth = require('../middleware/auth');
const Trade = require('../models/Trade');
const Insight = require('../models/Insight');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
router.use(auth);

// GET /api/insights/latest
router.get('/latest', async (req, res) => {
  try {
    const insight = await Insight.findOne({ userId: req.userId }).sort({ generatedAt: -1 });
    res.json({ insight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/insights/generate
router.post('/generate', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trades = await Trade.find({
      userId: req.userId,
      entryDate: { $gte: thirtyDaysAgo },
    }).select(
      'instrument assetClass direction setupType confluences session result pnlDollars pnlPips riskReward emotionPreTrade emotionPostTrade executionRating entryDate preTradeNotes postTradeNotes'
    );

    if (trades.length === 0) {
      return res.status(422).json({ error: 'No trades in the last 30 days to analyze' });
    }

    // Summarize trades as text (no images — cost efficient)
    const tradeSummaries = trades.map((t, i) => {
      const date = t.entryDate ? t.entryDate.toISOString().split('T')[0] : 'unknown';
      return `Trade ${i + 1}: [${date}] ${t.instrument} ${t.direction} | Setup: ${t.setupType || 'N/A'} | Session: ${t.session || 'N/A'} | TF: ${t.timeframe || 'N/A'} | Result: ${t.result || 'open'} | P&L: $${t.pnlDollars ?? 'N/A'} | R:R: ${t.riskReward ?? 'N/A'} | Emotion (pre): ${t.emotionPreTrade || 'N/A'} | Execution: ${t.executionRating ?? 'N/A'}/5 | Notes: ${t.postTradeNotes || '—'}`;
    }).join('\n');

    const prompt = `You are an expert trading coach reviewing a trader's journal. Below is a summary of their last ${trades.length} trades (past 30 days).

${tradeSummaries}

Analyze this data and respond in clear Markdown with these sections:
## Top 3 Performing Setups
## Recurring Mistakes
## Emotional Patterns Causing Losses
## Specific Recommendations

Be specific and reference actual setups, instruments, and patterns from the data. Keep total response under 600 words.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0].message.content.trim();

    const insight = await Insight.create({
      userId: req.userId,
      content,
      tradeCount: trades.length,
      periodLabel: 'Last 30 days',
      generatedAt: new Date(),
    });

    res.json({ insight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
