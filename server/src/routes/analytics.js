const router = require('express').Router();
const auth = require('../middleware/auth');
const Trade = require('../models/Trade');
const mongoose = require('mongoose');

router.use(auth);

// Helper: build date filter from query params (month=YYYY-MM, from=date, to=date)
function buildDateFilter(query) {
  const filter = {};
  if (query.month) {
    const [year, m] = query.month.split('-').map(Number);
    filter.entryDate = { $gte: new Date(year, m - 1, 1), $lt: new Date(year, m, 1) };
  } else if (query.from || query.to) {
    filter.entryDate = {};
    if (query.from) filter.entryDate.$gte = new Date(query.from);
    if (query.to) filter.entryDate.$lte = new Date(query.to);
  }
  return filter;
}

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const dateFilter = buildDateFilter(req.query);
    const match = { userId, status: 'closed', ...dateFilter };

    const [summary] = await Trade.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $eq: ['$result', 'loss'] }, 1, 0] } },
          breakevens: { $sum: { $cond: [{ $eq: ['$result', 'breakeven'] }, 1, 0] } },
          totalPnlDollars: { $sum: { $ifNull: ['$pnlDollars', 0] } },
          totalPnlPips: { $sum: { $ifNull: ['$pnlPips', 0] } },
          avgRR: { $avg: { $ifNull: ['$riskReward', null] } },
        },
      },
      {
        $addFields: {
          winRate: {
            $cond: [{ $gt: ['$totalTrades', 0] }, { $divide: ['$wins', '$totalTrades'] }, 0],
          },
        },
      },
    ]);

    // Open trades count (not affected by date filter)
    const openTrades = await Trade.countDocuments({ userId, status: 'open' });

    res.json({ summary: summary
      ? { ...summary, openTrades }
      : { totalTrades: 0, wins: 0, losses: 0, winRate: 0, openTrades } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/by-setup
router.get('/by-setup', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const dateFilter = buildDateFilter(req.query);

    const data = await Trade.aggregate([
      { $match: { userId, status: 'closed', ...dateFilter } },
      {
        $group: {
          _id: '$setupType',
          total: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
          avgRR: { $avg: '$riskReward' },
          totalPnl: { $sum: { $ifNull: ['$pnlDollars', 0] } },
        },
      },
      {
        $addFields: {
          winRate: { $cond: [{ $gt: ['$total', 0] }, { $divide: ['$wins', '$total'] }, 0] },
        },
      },
      { $sort: { total: -1 } },
    ]);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/by-session
router.get('/by-session', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const dateFilter = buildDateFilter(req.query);

    const data = await Trade.aggregate([
      { $match: { userId, status: 'closed', ...dateFilter } },
      {
        $group: {
          _id: '$session',
          total: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
          avgRR: { $avg: '$riskReward' },
        },
      },
      {
        $addFields: {
          winRate: { $cond: [{ $gt: ['$total', 0] }, { $divide: ['$wins', '$total'] }, 0] },
        },
      },
    ]);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/pnl-over-time
router.get('/pnl-over-time', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const dateFilter = buildDateFilter(req.query);

    const data = await Trade.aggregate([
      { $match: { userId, status: 'closed', ...dateFilter } },
      { $sort: { entryDate: 1 } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$entryDate' } },
          dailyPnl: { $sum: { $ifNull: ['$pnlDollars', 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: { date: '$_id', dailyPnl: 1, count: 1, _id: 0 },
      },
    ]);

    // Add running cumulative P&L
    let cumulative = 0;
    const withCumulative = data.map((d) => {
      cumulative += d.dailyPnl;
      return { ...d, cumulativePnl: parseFloat(cumulative.toFixed(2)) };
    });

    res.json({ data: withCumulative });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/emotion-heatmap
router.get('/emotion-heatmap', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const dateFilter = buildDateFilter(req.query);

    const data = await Trade.aggregate([
      { $match: { userId, status: 'closed', emotionPreTrade: { $ne: '' }, ...dateFilter } },
      {
        $group: {
          _id: { emotion: '$emotionPreTrade', result: '$result' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          emotion: '$_id.emotion',
          result: '$_id.result',
          count: 1,
          _id: 0,
        },
      },
    ]);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
