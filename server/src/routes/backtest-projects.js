const router = require('express').Router();
const auth = require('../middleware/auth');
const BacktestProject = require('../models/BacktestProject');
const Trade = require('../models/Trade');

// GET /api/backtest-projects — list with live stats
router.get('/', auth, async (req, res) => {
  try {
    const projects = await BacktestProject.find({ userId: req.userId }).sort({ createdAt: -1 });

    const withStats = await Promise.all(projects.map(async (p) => {
      const trades = await Trade.find({ userId: req.userId, projectId: p._id, tradeType: 'backtest', status: 'closed' });
      const wins   = trades.filter((t) => t.result === 'win').length;
      const total  = trades.length;
      const allTrades = await Trade.countDocuments({ userId: req.userId, projectId: p._id, tradeType: 'backtest' });
      const avgRR  = total > 0 ? (trades.reduce((s, t) => s + (t.riskReward || 0), 0) / total) : null;
      return {
        ...p.toObject(),
        stats: { total: allTrades, closed: total, wins, losses: total - wins,
          winRate: total > 0 ? wins / total : null,
          avgRR: avgRR ? parseFloat(avgRR.toFixed(2)) : null,
        },
      };
    }));

    res.json({ projects: withStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backtest-projects — create
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, strategy, instrument, targetWinRate, targetRR } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' });
    const project = await BacktestProject.create({
      userId: req.userId, name: name.trim(), description, strategy, instrument, targetWinRate, targetRR,
    });
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/backtest-projects/:id — update
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await BacktestProject.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/backtest-projects/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await BacktestProject.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!project) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
