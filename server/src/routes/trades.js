const router = require('express').Router();
const auth = require('../middleware/auth');
const Trade = require('../models/Trade');

// All routes require auth
router.use(auth);

// GET /api/trades
router.get('/', async (req, res) => {
  try {
    const { month, result, setup, instrument, status, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.userId };

    if (result)     filter.result     = result;
    if (status)     filter.status     = status;
    if (setup)      filter.setupType  = { $regex: setup,      $options: 'i' };
    if (instrument) filter.instrument = { $regex: instrument, $options: 'i' };
    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);
      filter.entryDate = { $gte: start, $lt: end };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [trades, total] = await Promise.all([
      Trade.find(filter).sort({ entryDate: -1 }).skip(skip).limit(Number(limit)),
      Trade.countDocuments(filter),
    ]);

    res.json({ trades, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trades/:id
router.get('/:id', async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, userId: req.userId });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    res.json({ trade });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trades
router.post('/', async (req, res) => {
  try {
    const trade = await Trade.create({ ...req.body, userId: req.userId });
    res.status(201).json({ trade });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/trades/:id
router.patch('/:id', async (req, res) => {
  try {
    const trade = await Trade.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    // Re-calc R:R if prices changed
    if (trade.entryPrice && trade.stopLoss && trade.takeProfit1) {
      const risk = Math.abs(trade.entryPrice - trade.stopLoss);
      const reward = Math.abs(trade.takeProfit1 - trade.entryPrice);
      trade.riskReward = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null;
      await trade.save();
    }

    res.json({ trade });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/trades/:id
router.delete('/:id', async (req, res) => {
  try {
    const trade = await Trade.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
