const router = require('express').Router();
const auth = require('../middleware/auth');
const StudyTopic = require('../models/StudyTopic');
const StudySetup = require('../models/StudySetup');
const RuleLibrary = require('../models/RuleLibrary');

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
    const { name, description, tags, color, masterRules, macroWindows, studyParameters } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Topic name is required' });
    const topic = await StudyTopic.create({ userId: req.userId, name: name.trim(), description, tags, color, masterRules, macroWindows, studyParameters });
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

// POST /api/study/topics/:id/clone — clone a topic's framework (no data entries)
router.post('/topics/:id/clone', auth, async (req, res) => {
  try {
    const source = await StudyTopic.findOne({ _id: req.params.id, userId: req.userId });
    if (!source) return res.status(404).json({ error: 'Topic not found' });
    const clone = await StudyTopic.create({
      userId: req.userId,
      name: (req.body.name || source.name + ' (Copy)').slice(0, 120),
      description: source.description,
      tags: source.tags,
      color: source.color,
      masterRules: source.masterRules,
      macroWindows: source.macroWindows,
      studyParameters: source.studyParameters,
    });
    res.status(201).json({ topic: { ...clone.toObject(), setupCount: 0 } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/study/topics/:id/promote-discovery — promote a discovery text to a master rule
router.post('/topics/:id/promote-discovery', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Discovery text required' });

    const topic = await StudyTopic.findOne({ _id: req.params.id, userId: req.userId });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const trimmed = text.trim();
    const existingTexts = (topic.masterRules || []).map(r => (typeof r === 'string' ? r : r.text));
    if (!existingTexts.includes(trimmed)) {
      topic.masterRules = [...(topic.masterRules || []), { text: trimmed, subs: [] }];
      await topic.save();
    }

    // Mark matching discoveries as promoted across all setups in this topic
    await StudySetup.updateMany(
      { topicId: req.params.id, userId: req.userId, 'discoveries.text': trimmed },
      { $set: { 'discoveries.$[elem].promoted': true } },
      { arrayFilters: [{ 'elem.text': trimmed }] }
    );

    res.json({ topic });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// POST /api/study/topics/:id/rules/import — import a library rule into a topic's masterRules
router.post('/topics/:id/rules/import', auth, async (req, res) => {
  try {
    const { ruleId } = req.body;
    if (!ruleId?.trim()) return res.status(400).json({ error: 'ruleId is required' });

    const topic = await StudyTopic.findOne({ _id: req.params.id, userId: req.userId });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const libRule = await RuleLibrary.findOne({ userId: req.userId, ruleId: ruleId.trim() });
    if (!libRule) return res.status(404).json({ error: 'Library rule not found' });

    const masterRules = topic.masterRules || [];
    const nextOrder = masterRules.reduce((max, r) => Math.max(max, r.sortOrder ?? 0), 0) + 1;

    const newEntry = {
      text: libRule.title,
      subs: [],
      scenarios: [{ name: 'Default', observations: [] }],
      ruleId: libRule.ruleId,
      isFromLibrary: true,
      ruleType: libRule.ruleType,
      macroTime: libRule.macroTime || null,
      branchType: libRule.defaultBranchType,
      branchLabels: [...(libRule.defaultBranchLabels || [])],
      sortOrder: nextOrder,
    };

    topic.masterRules = [...masterRules, newEntry];
    await topic.save();

    res.json({ topic });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    // Migration shims for legacy data
    const migrated = setups.map(s => {
      const obj = s.toObject();
      // Migrate legacy news string → newsEntries
      if (!obj.newsEntries?.length && obj.news) {
        obj.newsEntries = [{ time: '', severity: '', description: obj.news }];
      }
      // Migrate legacy observations → scenarios on rules; string subs → objects
      if (obj.setupRules?.length) {
        obj.setupRules = obj.setupRules.map(r => {
          if (!r) return r;
          let updated = r;
          if (r.observations?.length && !r.scenarios?.length) {
            updated = { ...updated, scenarios: [{ name: 'Default', observations: r.observations }] };
          }
          if (r.isMasterRule && Array.isArray(r.subs)) {
            updated = { ...updated, subs: r.subs.map(sub => typeof sub === 'string' ? { text: sub, scenarios: [] } : sub) };
          }
          return updated;
        });
      }
      // Migrate top-level confluences → first opportunity
      if (obj.confluences?.length && obj.opportunities?.length && !obj.opportunities[0]?.confluences?.length) {
        obj.opportunities = obj.opportunities.map((o, i) => i === 0 ? { ...o, confluences: obj.confluences } : o);
      }
      return obj;
    });
    res.json({ setups: migrated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/study/setups/:id
router.get('/setups/:id', auth, async (req, res) => {
  try {
    const setup = await StudySetup.findOne({ _id: req.params.id, userId: req.userId });
    if (!setup) return res.status(404).json({ error: 'Setup not found' });
    const obj = setup.toObject();
    // Migration shims
    if (!obj.newsEntries?.length && obj.news) {
      obj.newsEntries = [{ time: '', severity: '', description: obj.news }];
    }
    if (obj.setupRules?.length) {
      obj.setupRules = obj.setupRules.map(r => {
        if (!r) return r;
        let updated = r;
        if (r.observations?.length && !r.scenarios?.length) {
          updated = { ...updated, scenarios: [{ name: 'Default', observations: r.observations }] };
        }
        if (r.isMasterRule && Array.isArray(r.subs)) {
          updated = { ...updated, subs: r.subs.map(sub => typeof sub === 'string' ? { text: sub, scenarios: [] } : sub) };
        }
        return updated;
      });
    }
    if (obj.confluences?.length && obj.opportunities?.length && !obj.opportunities[0]?.confluences?.length) {
      obj.opportunities = obj.opportunities.map((o, i) => i === 0 ? { ...o, confluences: obj.confluences } : o);
    }
    res.json({ setup: obj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── helpers ──────────────────────────────────────────────────────────────────
// Compute completion rate from setupRules array
function computeCompletion(setupRules) {
  if (!Array.isArray(setupRules) || setupRules.length === 0) return { completionRate: null, firedRulesCount: 0, totalRulesCount: 0 };
  const total = setupRules.length;
  const fired = setupRules.filter(r => r && r.checked === true).length;
  const rate = parseFloat(((fired / total) * 100).toFixed(1));
  return { completionRate: rate, firedRulesCount: fired, totalRulesCount: total };
}

// Compute rMultiple for each opportunity (server-derives, never trusted from client)
function deriveOpportunityFields(opportunities) {
  if (!Array.isArray(opportunities)) return opportunities;
  return opportunities.map(o => {
    if (!o) return o;
    const entry = Number(o.entryPrice ?? o.entryLevel);
    const stop  = Number(o.stopPrice ?? o.stopLevel);
    const mfe   = Number(o.mfe);
    let rMultiple = o.rMultiple;
    if (!isNaN(entry) && !isNaN(stop) && !isNaN(mfe) && entry !== stop) {
      rMultiple = parseFloat((mfe / Math.abs(entry - stop)).toFixed(2));
    }
    return { ...o, rMultiple };
  });
}

// POST /api/study/setups
router.post('/setups', auth, async (req, res) => {
  try {
    const body = { ...req.body, userId: req.userId };
    // Server-compute scores — never trust client
    const { completionRate, firedRulesCount, totalRulesCount } = computeCompletion(body.setupRules);
    body.completionRate  = completionRate;
    body.firedRulesCount = firedRulesCount;
    body.totalRulesCount = totalRulesCount;
    // Derive rMultiple per opportunity
    body.opportunities = deriveOpportunityFields(body.opportunities);
    const setup = await StudySetup.create(body);
    res.status(201).json({ setup });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/study/setups/:id
router.put('/setups/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    // Server-compute scores — never trust client
    const { completionRate, firedRulesCount, totalRulesCount } = computeCompletion(body.setupRules);
    body.completionRate  = completionRate;
    body.firedRulesCount = firedRulesCount;
    body.totalRulesCount = totalRulesCount;
    // Derive rMultiple per opportunity
    body.opportunities = deriveOpportunityFields(body.opportunities);
    const setup = await StudySetup.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      body,
      { new: true, runValidators: false }
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

    // Confluence hit rate — read from opportunities, fallback to top-level
    const confCount = {};
    setups.forEach((s) => {
      const allConfs = new Set();
      (s.opportunities || []).forEach(o => (o?.confluences || []).forEach(c => allConfs.add(c)));
      if (allConfs.size === 0) (s.confluences || []).forEach(c => allConfs.add(c));
      allConfs.forEach(c => { confCount[c] = (confCount[c] || 0) + 1; });
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

    // Sweep type breakdown
    const sweepTypeCount = {};
    setups.forEach((s) => { if (s.sweepType) sweepTypeCount[s.sweepType] = (sweepTypeCount[s.sweepType] || 0) + 1; });
    const sweepTypeBreakdown = Object.keys(sweepTypeCount).length > 0 ? sweepTypeCount : null;

    // Target reached rate
    const targetReachedRate = total > 0
      ? Math.round((setups.filter((s) => s.reachedTarget).length / total) * 100)
      : null;

    // Return to PD rate
    const returnToPDRate = total > 0
      ? Math.round((setups.filter((s) => s.returnToPD).length / total) * 100)
      : null;

    // MSS direction breakdown
    const mssCount = {};
    setups.forEach((s) => { if (s.mssDirection) mssCount[s.mssDirection] = (mssCount[s.mssDirection] || 0) + 1; });
    const mssDirectionBreakdown = Object.keys(mssCount).length > 0 ? mssCount : null;

    // Macro window frequency
    const macroCount = {};
    setups.forEach((s) => {
      (s.macroWindows || []).forEach((w) => { macroCount[w] = (macroCount[w] || 0) + 1; });
    });
    const macroWindowFrequency = Object.keys(macroCount).length > 0
      ? Object.entries(macroCount)
          .sort((a, b) => b[1] - a[1])
          .reduce((acc, [k, v]) => ({ ...acc, [k]: { count: v, pct: Math.round((v / total) * 100) } }), {})
      : null;

    // Master rules adherence
    const topicDoc = await StudyTopic.findById(req.params.topicId);
    const masterRuleTexts = (topicDoc?.masterRules || [])
      .map(r => (typeof r === 'string' ? r : r.text))
      .filter(Boolean);
    let masterRulesAdherence = null;
    if (masterRuleTexts.length > 0) {
      const compliantCount = setups.filter(s => {
        const setupTexts = (s.setupRules || []).map(r => (typeof r === 'string' ? r : r?.text) || '').filter(Boolean);
        return masterRuleTexts.every(mt => setupTexts.some(st => st === mt || st.includes(mt) || mt.includes(st)));
      }).length;
      masterRulesAdherence = Math.round((compliantCount / total) * 100);
    }

    // Top discoveries (most frequently logged)
    const discMap = {};
    setups.forEach(s => {
      (s.discoveries || []).forEach(d => {
        const t = d?.text?.trim();
        if (t) discMap[t] = (discMap[t] || 0) + 1;
      });
    });
    const topDiscoveries = Object.entries(discMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([text, count]) => ({ text, count }));

    res.json({ total, confluenceHitRate, bestSession, outcomeBreakdown, avgMaxRun, biasWinRate, mostCommonTime,
      sweepTypeBreakdown, targetReachedRate, returnToPDRate, mssDirectionBreakdown, macroWindowFrequency,
      masterRulesAdherence, topDiscoveries });
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
      // Gather confluences from opportunities, fallback to top-level
      const allConfs = new Set();
      (s.opportunities || []).forEach(o => (o?.confluences || []).forEach(c => allConfs.add(c)));
      if (allConfs.size === 0) (s.confluences || []).forEach(c => allConfs.add(c));
      const confs = [...allConfs];
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

    // ── Sweep type outcome matrix ────────────────────────────────────────
    const sweepOutcomeMap = {};
    setups.forEach((s) => {
      if (!s.sweepType) return;
      if (!sweepOutcomeMap[s.sweepType]) sweepOutcomeMap[s.sweepType] = { count: 0, textbook: 0, totalRun: 0, runCount: 0 };
      sweepOutcomeMap[s.sweepType].count++;
      if (s.outcome === 'Textbook') sweepOutcomeMap[s.sweepType].textbook++;
      if (s.maxRun != null) { sweepOutcomeMap[s.sweepType].totalRun += s.maxRun; sweepOutcomeMap[s.sweepType].runCount++; }
    });
    const sweepTypeOutcomeMatrix = Object.entries(sweepOutcomeMap).map(([sweepType, v]) => ({
      sweepType,
      count: v.count,
      textbookRate: Math.round((v.textbook / v.count) * 100),
      avgMaxRun: v.runCount > 0 ? parseFloat((v.totalRun / v.runCount).toFixed(2)) : null,
    })).sort((a, b) => b.textbookRate - a.textbookRate);

    // ── Macro window outcome matrix ──────────────────────────────────────
    const macroOutcomeMap = {};
    setups.forEach((s) => {
      (s.macroWindows || []).forEach((w) => {
        if (!macroOutcomeMap[w]) macroOutcomeMap[w] = { count: 0, textbook: 0, totalRun: 0, runCount: 0 };
        macroOutcomeMap[w].count++;
        if (s.outcome === 'Textbook') macroOutcomeMap[w].textbook++;
        if (s.maxRun != null) { macroOutcomeMap[w].totalRun += s.maxRun; macroOutcomeMap[w].runCount++; }
      });
    });
    const macroWindowOutcomeMatrix = Object.entries(macroOutcomeMap).map(([macroWindow, v]) => ({
      macroWindow,
      count: v.count,
      textbookRate: Math.round((v.textbook / v.count) * 100),
      avgMaxRun: v.runCount > 0 ? parseFloat((v.totalRun / v.runCount).toFixed(2)) : null,
    })).sort((a, b) => b.textbookRate - a.textbookRate);

    // ── Day-of-week outcome breakdown (Phase 5) ──────────────────────────
    const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const dowMap = {};
    setups.forEach((s) => {
      if (!s.dayOfWeek) return;
      if (!dowMap[s.dayOfWeek]) dowMap[s.dayOfWeek] = { count: 0, textbook: 0 };
      dowMap[s.dayOfWeek].count++;
      const opp = s.opportunities?.[0];
      if ((opp?.outcome || s.outcome) === 'Textbook') dowMap[s.dayOfWeek].textbook++;
    });
    const dayOfWeekMatrix = DAY_ORDER
      .filter(d => dowMap[d])
      .map(d => ({ day: d, count: dowMap[d].count, textbookRate: Math.round((dowMap[d].textbook / dowMap[d].count) * 100) }));

    // ── Direction × outcome (Phase 5) ────────────────────────────────────
    const dirMap = {};
    setups.forEach((s) => {
      if (!s.direction) return;
      if (!dirMap[s.direction]) dirMap[s.direction] = { count: 0, textbook: 0 };
      dirMap[s.direction].count++;
      const opp = s.opportunities?.[0];
      if ((opp?.outcome || s.outcome) === 'Textbook') dirMap[s.direction].textbook++;
    });
    const directionMatrix = Object.entries(dirMap).map(([dir, v]) => ({
      direction: dir, count: v.count, textbookRate: Math.round((v.textbook / v.count) * 100),
    })).sort((a, b) => b.count - a.count);

    // ── Clarity score distribution (Phase 5) ─────────────────────────────
    const clarityDist = [1, 2, 3].map(score => {
      const matching = setups.filter(s => s.clarityScore === score);
      const tb = matching.filter(s => { const opp = s.opportunities?.[0]; return (opp?.outcome || s.outcome) === 'Textbook'; }).length;
      return { score, label: { 1: 'Choppy', 2: 'Readable', 3: 'Textbook' }[score], count: matching.length, textbookRate: matching.length > 0 ? Math.round((tb / matching.length) * 100) : null };
    }).filter(c => c.count > 0);

    // ── Average completion rate (Phase 5) ────────────────────────────────
    const crSetups = setups.filter(s => s.completionRate != null);
    const avgCompletionRate = crSetups.length > 0
      ? parseFloat((crSetups.reduce((sum, s) => sum + s.completionRate, 0) / crSetups.length).toFixed(1))
      : null;

    res.json({ total, topCombos, timeHeatmap, sessionMatrix, biasAccuracy, sweepTypeOutcomeMatrix, macroWindowOutcomeMatrix, dayOfWeekMatrix, directionMatrix, clarityDist, avgCompletionRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC SHARE LINKS  (Phase 4)
// ════════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');

// POST /api/study/setups/:id/share — generate a share token
router.post('/setups/:id/share', auth, async (req, res) => {
  try {
    const setup = await StudySetup.findOne({ _id: req.params.id, userId: req.userId });
    if (!setup) return res.status(404).json({ error: 'Setup not found' });
    if (!setup.shareToken) {
      setup.shareToken = crypto.randomBytes(20).toString('hex');
    }
    setup.isPublic = true;
    await setup.save();
    res.json({ shareToken: setup.shareToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/study/setups/:id/unshare — revoke share token
router.post('/setups/:id/unshare', auth, async (req, res) => {
  try {
    const setup = await StudySetup.findOne({ _id: req.params.id, userId: req.userId });
    if (!setup) return res.status(404).json({ error: 'Setup not found' });
    setup.isPublic = false;
    setup.shareToken = undefined;
    await setup.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/study/share/:token — public view (no auth required)
router.get('/share/:token', async (req, res) => {
  try {
    const setup = await StudySetup.findOne({ shareToken: req.params.token, isPublic: true });
    if (!setup) return res.status(404).json({ error: 'Shared entry not found or no longer public' });
    // Include the topic name for context
    const topic = await StudyTopic.findById(setup.topicId).select('name color').lean();
    res.json({ setup, topic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
