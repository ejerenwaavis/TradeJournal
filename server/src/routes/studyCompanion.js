const router = require('express').Router();
const auth = require('../middleware/auth');
const StudyTopic = require('../models/StudyTopic');
const StudySetup = require('../models/StudySetup');

// ── Helper: generate all k-combinations of an array ──────────────────────────
function combinations(arr, k) {
  const result = [];
  function pick(start, current) {
    if (current.length === k) { result.push([...current]); return; }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      pick(i + 1, current);
      current.pop();
    }
  }
  pick(0, []);
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// TOPICS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/study/topics
router.get('/topics', auth, async (req, res) => {
  try {
    const topics = await StudyTopic.find({ userId: req.userId }).sort({ createdAt: -1 });
    // Attach setup count to each topic
    const withCounts = await Promise.all(
      topics.map(async (t) => {
        const count = await StudySetup.countDocuments({ topicId: t._id, userId: req.userId });
        return { ...t.toObject(), setupCount: count };
      })
    );
    res.json({ topics: withCounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/study/topics
router.post('/topics', auth, async (req, res) => {
  try {
    const { name, description, tags, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Topic name is required' });
    const topic = await StudyTopic.create({ userId: req.userId, name: name.trim(), description, tags, color });
    res.status(201).json({ topic });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/study/topics/:id
router.put('/topics/:id', auth, async (req, res) => {
  try {
    const topic = await StudyTopic.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json({ topic });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/study/topics/:id — also deletes all its setups
router.delete('/topics/:id', auth, async (req, res) => {
  try {
    const topic = await StudyTopic.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    await StudySetup.deleteMany({ topicId: req.params.id, userId: req.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// SETUPS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/study/setups?topicId=
router.get('/setups', auth, async (req, res) => {
  try {
    const filter = { userId: req.userId };
    if (req.query.topicId) filter.topicId = req.query.topicId;
    const setups = await StudySetup.find(filter).sort({ createdAt: -1 });
    res.json({ setups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/study/setups/:id
router.get('/setups/:id', auth, async (req, res) => {
  try {
    const setup = await StudySetup.findOne({ _id: req.params.id, userId: req.userId });
    if (!setup) return res.status(404).json({ error: 'Setup not found' });
    res.json({ setup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/study/setups
router.post('/setups', auth, async (req, res) => {
  try {
    const setup = await StudySetup.create({ ...req.body, userId: req.userId });
    res.status(201).json({ setup });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/study/setups/:id
router.put('/setups/:id', auth, async (req, res) => {
  try {
    const setup = await StudySetup.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!setup) return res.status(404).json({ error: 'Setup not found' });
    res.json({ setup });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/study/setups/:id
router.delete('/setups/:id', auth, async (req, res) => {
  try {
    const setup = await StudySetup.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!setup) return res.status(404).json({ error: 'Setup not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS — per topic
// ════════════════════════════════════════════════════════════════════════════

// GET /api/study/analytics/:topicId
router.get('/analytics/:topicId', auth, async (req, res) => {
  try {
    const setups = await StudySetup.find({ topicId: req.params.topicId, userId: req.userId });
    if (!setups.length) return res.json({ empty: true });

    const total = setups.length;

    // Confluence hit rate
    const confCount = {};
    setups.forEach((s) => {
      (s.confluences || []).forEach((c) => {
        confCount[c] = (confCount[c] || 0) + 1;
      });
    });
    const confluenceHitRate = Object.entries(confCount)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [k, v]) => ({ ...acc, [k]: { count: v, pct: Math.round((v / total) * 100) } }), {});

    // Best session
    const sessionCount = {};
    setups.forEach((s) => { if (s.session) sessionCount[s.session] = (sessionCount[s.session] || 0) + 1; });
    const bestSession = Object.entries(sessionCount).sort((a, b) => b[1] - a[1]).map(([s, c]) => ({ session: s, count: c }));

    // Outcome breakdown
    const outcomeBreakdown = { Textbook: 0, Partial: 0, Failed: 0, Pending: 0 };
    setups.forEach((s) => { if (s.outcome && outcomeBreakdown[s.outcome] !== undefined) outcomeBreakdown[s.outcome]++; });

    // Avg max run
    const withRun = setups.filter((s) => s.maxRun != null);
    const avgMaxRun = withRun.length > 0
      ? parseFloat((withRun.reduce((sum, s) => sum + s.maxRun, 0) / withRun.length).toFixed(2))
      : null;

    // Bias win rate (Textbook = "win")
    const biasGroups = { Bullish: { total: 0, textbook: 0 }, Bearish: { total: 0, textbook: 0 } };
    setups.forEach((s) => {
      if (s.bias === 'Bullish' || s.bias === 'Bearish') {
        biasGroups[s.bias].total++;
        if (s.outcome === 'Textbook') biasGroups[s.bias].textbook++;
      }
    });
    const biasWinRate = Object.entries(biasGroups).reduce((acc, [b, g]) => ({
      ...acc,
      [b]: g.total > 0 ? Math.round((g.textbook / g.total) * 100) : null,
    }), {});

    // Most common times (top 3)
    const timeCount = {};
    setups.forEach((s) => { if (s.timeOfTrade) timeCount[s.timeOfTrade] = (timeCount[s.timeOfTrade] || 0) + 1; });
    const mostCommonTime = Object.entries(timeCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => ({ time: t, count: c }));

    res.json({ total, confluenceHitRate, bestSession, outcomeBreakdown, avgMaxRun, biasWinRate, mostCommonTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS — global (Phase 2 cross-topic)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/study/analytics/global
router.get('/analytics/global', auth, async (req, res) => {
  try {
    const setups = await StudySetup.find({ userId: req.userId });
    if (!setups.length) return res.json({ empty: true });

    const total = setups.length;

    // ── Top confluence combinations (pairs + triples) ─────────────────────
    const comboMap = {};
    setups.forEach((s) => {
      const confs = [...new Set(s.confluences || [])];
      if (confs.length < 2) return;
      const sizes = confs.length >= 3 ? [2, 3] : [2];
      sizes.forEach((k) => {
        combinations(confs, k).forEach((combo) => {
          const key = [...combo].sort().join(' + ');
          if (!comboMap[key]) comboMap[key] = { appearances: 0, textbook: 0, totalRun: 0, runCount: 0 };
          comboMap[key].appearances++;
          if (s.outcome === 'Textbook') comboMap[key].textbook++;
          if (s.maxRun != null) { comboMap[key].totalRun += s.maxRun; comboMap[key].runCount++; }
        });
      });
    });
    const topCombos = Object.entries(comboMap)
      .filter(([, v]) => v.appearances >= 2)
      .map(([combo, v]) => ({
        combo,
        appearances: v.appearances,
        textbookRate: Math.round((v.textbook / v.appearances) * 100),
        avgMaxRun: v.runCount > 0 ? parseFloat((v.totalRun / v.runCount).toFixed(2)) : null,
      }))
      .sort((a, b) => b.textbookRate - a.textbookRate || b.appearances - a.appearances)
      .slice(0, 20);

    // ── Time-of-day heatmap (0-23 hours) ─────────────────────────────────
    const hourMap = {};
    setups.forEach((s) => {
      if (!s.timeOfTrade) return;
      const h = parseInt(s.timeOfTrade.split(':')[0], 10);
      if (isNaN(h)) return;
      if (!hourMap[h]) hourMap[h] = { count: 0, textbook: 0 };
      hourMap[h].count++;
      if (s.outcome === 'Textbook') hourMap[h].textbook++;
    });
    const timeHeatmap = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourMap[h]?.count || 0,
      textbookRate: hourMap[h] ? Math.round((hourMap[h].textbook / hourMap[h].count) * 100) : 0,
    }));

    // ── Session performance matrix ────────────────────────────────────────
    const sessionMap = {};
    setups.forEach((s) => {
      if (!s.session) return;
      if (!sessionMap[s.session]) sessionMap[s.session] = { count: 0, textbook: 0, totalRun: 0, runCount: 0 };
      sessionMap[s.session].count++;
      if (s.outcome === 'Textbook') sessionMap[s.session].textbook++;
      if (s.maxRun != null) { sessionMap[s.session].totalRun += s.maxRun; sessionMap[s.session].runCount++; }
    });
    const sessionMatrix = Object.entries(sessionMap)
      .map(([session, v]) => ({
        session,
        count: v.count,
        textbookRate: Math.round((v.textbook / v.count) * 100),
        avgMaxRun: v.runCount > 0 ? parseFloat((v.totalRun / v.runCount).toFixed(2)) : null,
      }))
      .sort((a, b) => b.textbookRate - a.textbookRate);

    // ── Overall bias accuracy ─────────────────────────────────────────────
    const biasAcc = { Bullish: { total: 0, textbook: 0 }, Bearish: { total: 0, textbook: 0 } };
    setups.forEach((s) => {
      if (s.bias === 'Bullish' || s.bias === 'Bearish') {
        biasAcc[s.bias].total++;
        if (s.outcome === 'Textbook') biasAcc[s.bias].textbook++;
      }
    });
    const biasAccuracy = Object.entries(biasAcc).reduce((acc, [b, g]) => ({
      ...acc, [b]: { total: g.total, textbookRate: g.total > 0 ? Math.round((g.textbook / g.total) * 100) : null },
    }), {});

    res.json({ total, topCombos, timeHeatmap, sessionMatrix, biasAccuracy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
