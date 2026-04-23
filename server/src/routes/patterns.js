const router = require('express').Router();
const auth   = require('../middleware/auth');
const StudySetup = require('../models/StudySetup');
const StudyTopic = require('../models/StudyTopic');
const AnalyticsCache = require('../models/AnalyticsCache');

router.use(auth);

// ── MongoDB-backed cache helpers ─────────────────────────────────────────────

async function getCached(userId, topicId, panel, currentEntryCount) {
  const doc = await AnalyticsCache.findOne({ userId, topicId, panel }).lean();
  if (!doc) return null;
  return {
    ...doc.data,
    cached: true,
    computedAt: doc.computedAt.getTime(),
    entryCountAtComputation: doc.entryCountAtComputation,
    currentEntryCount,
  };
}

async function setCached(userId, topicId, panel, data, entryCount) {
  await AnalyticsCache.findOneAndUpdate(
    { userId, topicId, panel },
    { data, computedAt: new Date(), entryCountAtComputation: entryCount },
    { upsert: true, new: true }
  );
}

async function bustCache(userId, topicId, panel) {
  await AnalyticsCache.deleteOne({ userId, topicId, panel });
}

// ── Math helpers ─────────────────────────────────────────────────────────────

function avg(nums) {
  const valid = nums.filter(n => n != null && !isNaN(n));
  return valid.length ? parseFloat((valid.reduce((s, n) => s + n, 0) / valid.length).toFixed(3)) : null;
}

function winRate(rValues) {
  if (!rValues.length) return null;
  return parseFloat(((rValues.filter(r => (r ?? 0) >= 1.0).length / rValues.length) * 100).toFixed(1));
}

// Single source of truth — always read firedBranch only
function getFiredBranch(rule) {
  if (!rule) return null;
  const fb = rule.firedBranch;
  if (fb != null && fb !== '') return fb;
  if (rule.neitherFired === true) return 'neither';
  return null;
}

// Best rMultiple from opportunities or top-level
function getRMultiple(setup) {
  const opps = setup.opportunities || [];
  if (opps.length) {
    const vals = opps.map(o => o?.rMultiple).filter(v => v != null);
    if (vals.length) return Math.max(...vals);
  }
  return setup.rMultiple ?? null;
}

function mode(arr) {
  if (!arr.length) return null;
  const freq = {};
  arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

// ════════════════════════════════════════════════════════════════════════════
// Panel 1 — Rule Performance
// GET /api/analytics/patterns/rules?topicId=&refresh=true
// ════════════════════════════════════════════════════════════════════════════
router.get('/rules', async (req, res) => {
  try {
    const { topicId, refresh } = req.query;
    if (!topicId) return res.status(400).json({ error: 'topicId required' });

    const totalEntries = await StudySetup.countDocuments({ topicId, userId: req.userId });
    if (totalEntries < 20) return res.json({ insufficientData: true, entryCount: totalEntries, threshold: 20 });

    if (!refresh) {
      const cached = await getCached(req.userId, topicId, 'rules', totalEntries);
      if (cached) return res.json(cached);
    }

    const setups = await StudySetup.find({ topicId, userId: req.userId }).lean();

    const ruleIndex = {};
    setups.forEach(s => {
      const r = getRMultiple(s);
      const mae = s.mae ?? null;
      (s.setupRules || []).forEach(rule => {
        if (!rule?.isMasterRule) return;
        const title = rule.text || '(untitled)';
        const id    = rule.ruleId || title;
        if (!ruleIndex[id]) ruleIndex[id] = { ruleId: id, title, firedR: [], notFiredR: [], firedMAE: [], notFiredMAE: [], branchMap: {} };

        const branch = getFiredBranch(rule);

        if (rule.checked) {
          ruleIndex[id].firedR.push(r);
          ruleIndex[id].firedMAE.push(mae);
          if (branch) {
            if (!ruleIndex[id].branchMap[branch]) ruleIndex[id].branchMap[branch] = [];
            ruleIndex[id].branchMap[branch].push(r);
          }
        } else {
          ruleIndex[id].notFiredR.push(r);
          ruleIndex[id].notFiredMAE.push(mae);
        }
      });
    });

    const individualRules = Object.values(ruleIndex).map(ri => {
      const fireRate         = parseFloat(((ri.firedR.length / setups.length) * 100).toFixed(1));
      const avgRWhenFired    = avg(ri.firedR);
      const avgRWhenNotFired = avg(ri.notFiredR);
      const avgMAEWhenFired    = avg(ri.firedMAE);
      const avgMAEWhenNotFired = avg(ri.notFiredMAE);

      const branchOutcomes = Object.entries(ri.branchMap).map(([branch, rs]) => ({
        branch,
        count: rs.length,
        avgR: avg(rs),
        winRate: winRate(rs),
      })).sort((a, b) => b.count - a.count);

      const highestRBranch = [...branchOutcomes].sort((a, b) => (b.avgR || 0) - (a.avgR || 0))[0]?.branch || null;
      const mostCommonBranch = branchOutcomes[0]?.branch || null;

      return { ruleId: ri.ruleId, title: ri.title, fireRate, avgRWhenFired, avgRWhenNotFired, avgMAEWhenFired, avgMAEWhenNotFired, mostCommonBranch, highestRBranch, branchOutcomes };
    }).sort((a, b) => (b.avgRWhenFired || 0) - (a.avgRWhenFired || 0));

    // Rule co-occurrence pairs
    const pairMap = {};
    setups.forEach(s => {
      const r = getRMultiple(s);
      const firedRules = (s.setupRules || []).filter(rule => rule?.isMasterRule && rule?.checked);
      for (let i = 0; i < firedRules.length; i++) {
        for (let j = i + 1; j < firedRules.length; j++) {
          const idA = firedRules[i].ruleId || firedRules[i].text || '?';
          const idB = firedRules[j].ruleId || firedRules[j].text || '?';
          const key = [idA, idB].sort().join('|||');
          if (!pairMap[key]) pairMap[key] = { idA, titleA: firedRules[i].text, idB, titleB: firedRules[j].text, rValues: [] };
          pairMap[key].rValues.push(r);
        }
      }
    });

    const ruleCombinations = Object.values(pairMap).map(p => ({
      ruleIdA: p.idA, titleA: p.titleA,
      ruleIdB: p.idB, titleB: p.titleB,
      coOccurrenceCount: p.rValues.length,
      avgR: avg(p.rValues),
      winRate: winRate(p.rValues),
    })).sort((a, b) => (b.avgR || 0) - (a.avgR || 0));

    const result = { individualRules, ruleCombinations };
    await setCached(req.userId, topicId, 'rules', result, totalEntries);
    res.json({ ...result, cached: false, computedAt: Date.now(), entryCountAtComputation: totalEntries, currentEntryCount: totalEntries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Panel 2 — Session Sequences
// GET /api/analytics/patterns/sequences?topicId=
// ════════════════════════════════════════════════════════════════════════════
router.get('/sequences', async (req, res) => {
  try {
    const { topicId, refresh } = req.query;
    if (!topicId) return res.status(400).json({ error: 'topicId required' });

    const totalEntries = await StudySetup.countDocuments({ topicId, userId: req.userId });
    if (totalEntries < 30) return res.json({ insufficientData: true, entryCount: totalEntries, threshold: 30 });

    if (!refresh) {
      const cached = await getCached(req.userId, topicId, 'sequences', totalEntries);
      if (cached) return res.json(cached);
    }

    const setups = await StudySetup.find({ topicId, userId: req.userId }).lean();

    function buildSequence(setupRules) {
      const masterRules = (setupRules || []).filter(r => r?.isMasterRule);
      if (!masterRules.length) return null;
      return masterRules.map(r => {
        const branch = getFiredBranch(r);
        if (branch) return branch;
        if (!r.branchType || r.branchType === 'none') return 'none';
        return r.checked ? 'fired' : 'none';
      }).join('-');
    }

    const sequenceMap = {};
    setups.forEach(s => {
      const seq = buildSequence(s.setupRules);
      if (!seq) return;
      const r = getRMultiple(s);
      if (!sequenceMap[seq]) sequenceMap[seq] = { rValues: [], directions: [], clarityScores: [] };
      sequenceMap[seq].rValues.push(r);
      if (s.direction) sequenceMap[seq].directions.push(s.direction);
      if (s.clarityScore) sequenceMap[seq].clarityScores.push(s.clarityScore);
    });

    const fullSequences = Object.entries(sequenceMap).map(([sequence, v]) => ({
      sequence,
      count: v.rValues.length,
      avgR: avg(v.rValues),
      winRate: winRate(v.rValues),
      commonDirection: mode(v.directions),
      commonClarityScore: mode(v.clarityScores),
    })).sort((a, b) => b.count - a.count || (b.avgR || 0) - (a.avgR || 0));

    // High-value subsequences
    const subseqMap = {};
    setups.forEach(s => {
      const masterRules = (s.setupRules || []).filter(r => r?.isMasterRule);
      if (masterRules.length < 3) return;
      const r = getRMultiple(s);
      for (let len = 3; len <= masterRules.length; len++) {
        for (let start = 0; start + len <= masterRules.length; start++) {
          const slice = masterRules.slice(start, start + len);
          const subseq = slice.map(rule => {
            const branch = getFiredBranch(rule);
            if (branch) return branch;
            if (!rule.branchType || rule.branchType === 'none') return 'none';
            return rule.checked ? 'fired' : 'none';
          }).join('-');
          const key = `${start}:${start + len - 1}:${subseq}`;
          if (!subseqMap[key]) subseqMap[key] = { startRuleIndex: start, endRuleIndex: start + len - 1, sequence: subseq, rValues: [] };
          subseqMap[key].rValues.push(r);
        }
      }
    });

    const highValueSubsequences = Object.values(subseqMap)
      .filter(v => v.rValues.length >= 3)
      .map(v => ({
        startRuleIndex: v.startRuleIndex,
        endRuleIndex: v.endRuleIndex,
        sequence: v.sequence,
        count: v.rValues.length,
        avgR: avg(v.rValues),
        winRate: winRate(v.rValues),
      }))
      .sort((a, b) => (b.avgR || 0) - (a.avgR || 0))
      .slice(0, 10);

    const result = { fullSequences, highValueSubsequences };
    await setCached(req.userId, topicId, 'sequences', result, totalEntries);
    res.json({ ...result, cached: false, computedAt: Date.now(), entryCountAtComputation: totalEntries, currentEntryCount: totalEntries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Panel 3 — Narrative Signals (rebuilt with TF-IDF + 3 R-groups)
// GET /api/analytics/patterns/narrative?topicId=
// ════════════════════════════════════════════════════════════════════════════
const STOP_WORDS = new Set([
  'the','a','an','is','was','at','to','of','and','or','it','price',
  'that','this','with','for','not','from','then','into','its','in',
  'on','be','as','by','we','he','she','they','i','my','has','have',
  'had','are','were','been','but','so','if','up','did','do','will',
  'would','could','should','may','might','just','very','also','like',
  'move','market','trade','went','around','above','below','back',
  'using','start','shows','after','before','during','level','candle',
  'body','wick','time','open','close','high','low','area','zone',
  'point','looking','watch','expect','see','get','got','take','run',
  'push','hit','reach','form','forms','about','over','under',
]);

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function buildNgrams(tokens, n) {
  const result = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(' '));
  }
  return result;
}

function gatherText(setup) {
  const parts = [setup.narrative || '', setup.notes || ''];
  (setup.discoveries || []).forEach(d => { if (d?.text) parts.push(d.text); });
  return parts.join(' ');
}

function computeTfIdf(group) {
  const N = group.length;
  if (!N) return {};

  // Per-document phrase sets and phrase→TF maps
  const docPhrases = group.map(text => {
    const tokens = tokenize(text);
    const phraseFreq = {};
    [1, 2, 3].forEach(n => {
      buildNgrams(tokens, n).forEach(p => { phraseFreq[p] = (phraseFreq[p] || 0) + 1; });
    });
    const totalPhrases = Object.values(phraseFreq).reduce((s, c) => s + c, 0) || 1;
    const tf = {};
    Object.entries(phraseFreq).forEach(([p, c]) => { tf[p] = c / totalPhrases; });
    return { tf, phraseSet: new Set(Object.keys(phraseFreq)) };
  });

  // IDF: how many documents contain each phrase
  const docFreq = {};
  docPhrases.forEach(({ phraseSet }) => {
    phraseSet.forEach(p => { docFreq[p] = (docFreq[p] || 0) + 1; });
  });

  // Average TF-IDF across the group
  const avgTfIdf = {};
  const allPhrases = Object.keys(docFreq);
  allPhrases.forEach(phrase => {
    const idf = Math.log(N / (1 + docFreq[phrase]));
    const totalTf = docPhrases.reduce((s, { tf }) => s + (tf[phrase] || 0), 0);
    avgTfIdf[phrase] = { score: (totalTf / N) * idf, docFrequency: docFreq[phrase] };
  });

  return avgTfIdf;
}

router.get('/narrative', async (req, res) => {
  try {
    const { topicId, refresh } = req.query;
    if (!topicId) return res.status(400).json({ error: 'topicId required' });

    const totalEntries = await StudySetup.countDocuments({ topicId, userId: req.userId });
    if (totalEntries < 40) return res.json({ insufficientData: true, entryCount: totalEntries, threshold: 40 });

    if (!refresh) {
      const cached = await getCached(req.userId, topicId, 'narrative', totalEntries);
      if (cached) return res.json(cached);
    }

    const setups = await StudySetup.find({ topicId, userId: req.userId }).lean();

    const highR = setups.filter(s => (getRMultiple(s) ?? -Infinity) >= 2.0);
    const midR  = setups.filter(s => { const r = getRMultiple(s); return r != null && r >= 1.0 && r < 2.0; });
    const lowR  = setups.filter(s => { const r = getRMultiple(s); return r != null && r < 1.0; });

    const minimumEntriesWarning = highR.length < 15 || lowR.length < 15;

    const highRTfIdf = computeTfIdf(highR.map(gatherText));
    const midRTfIdf  = computeTfIdf(midR.map(gatherText));
    const lowRTfIdf  = computeTfIdf(lowR.map(gatherText));

    // All phrases that appear in at least 3 sessions in any group
    const allPhrases = new Set([
      ...Object.entries(highRTfIdf).filter(([, v]) => v.docFrequency >= 3).map(([p]) => p),
      ...Object.entries(midRTfIdf).filter(([, v]) => v.docFrequency >= 3).map(([p]) => p),
      ...Object.entries(lowRTfIdf).filter(([, v]) => v.docFrequency >= 3).map(([p]) => p),
    ]);

    const signals = [];
    allPhrases.forEach(phrase => {
      const h = highRTfIdf[phrase]?.score || 0;
      const m = midRTfIdf[phrase]?.score  || 0;
      const l = lowRTfIdf[phrase]?.score  || 0;
      const highVsLow = parseFloat((h - l).toFixed(4));
      const docFreq = Math.max(
        highRTfIdf[phrase]?.docFrequency || 0,
        midRTfIdf[phrase]?.docFrequency  || 0,
        lowRTfIdf[phrase]?.docFrequency  || 0,
      );
      signals.push({ phrase, signalScore: highVsLow, midScore: parseFloat((m - l).toFixed(4)), docFrequency: docFreq });
    });

    signals.sort((a, b) => Math.abs(b.signalScore) - Math.abs(a.signalScore));

    const highRSignals = signals.filter(s => s.signalScore > 0).slice(0, 20);
    const lowRSignals  = signals.filter(s => s.signalScore < 0).slice(0, 20);

    // Mid-R signals vs low-R (language distinctive in decent 1-2R sessions)
    const midSignalsSorted = [...signals].sort((a, b) => Math.abs(b.midScore) - Math.abs(a.midScore));
    const midRSignals = midSignalsSorted.filter(s => s.midScore > 0).slice(0, 20);

    const result = {
      highRSignals, midRSignals, lowRSignals,
      totalHighR: highR.length, totalMidR: midR.length, totalLowR: lowR.length,
      minimumEntriesWarning,
    };
    await setCached(req.userId, topicId, 'narrative', result, totalEntries);
    res.json({ ...result, cached: false, computedAt: Date.now(), entryCountAtComputation: totalEntries, currentEntryCount: totalEntries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Panel 4 — Macro Behavior
// GET /api/analytics/patterns/macros?topicId=
// ════════════════════════════════════════════════════════════════════════════
router.get('/macros', async (req, res) => {
  try {
    const { topicId, refresh } = req.query;
    if (!topicId) return res.status(400).json({ error: 'topicId required' });

    const totalEntries = await StudySetup.countDocuments({ topicId, userId: req.userId });
    if (totalEntries < 50) return res.json({ insufficientData: true, entryCount: totalEntries, threshold: 50 });

    if (!refresh) {
      const cached = await getCached(req.userId, topicId, 'macros', totalEntries);
      if (cached) return res.json(cached);
    }

    const setups = await StudySetup.find({ topicId, userId: req.userId }).lean();

    const macroMap = {};

    setups.forEach(s => {
      const r = getRMultiple(s);
      const masterRules = (s.setupRules || []).filter(rule => rule?.isMasterRule);
      const rule1Branch = getFiredBranch(masterRules[0]);

      masterRules.forEach(rule => {
        const macroTime = rule.macroTime;
        if (!macroTime) return;
        if (!macroMap[macroTime]) macroMap[macroTime] = { entries: [], dayMap: {}, sweepMap: {}, dirMap: {} };

        const branch = getFiredBranch(rule) || (rule.checked ? 'fired' : 'none');

        macroMap[macroTime].entries.push({ branch, r, day: s.dayOfWeek, direction: s.direction });

        if (s.dayOfWeek) {
          if (!macroMap[macroTime].dayMap[s.dayOfWeek]) macroMap[macroTime].dayMap[s.dayOfWeek] = {};
          macroMap[macroTime].dayMap[s.dayOfWeek][branch] = (macroMap[macroTime].dayMap[s.dayOfWeek][branch] || 0) + 1;
        }

        const sweepKey = rule1Branch ? `After ${rule1Branch}` : 'No Rule 1';
        if (!macroMap[macroTime].sweepMap[sweepKey]) macroMap[macroTime].sweepMap[sweepKey] = {};
        macroMap[macroTime].sweepMap[sweepKey][branch] = (macroMap[macroTime].sweepMap[sweepKey][branch] || 0) + 1;

        if (s.direction) {
          if (!macroMap[macroTime].dirMap[s.direction]) macroMap[macroTime].dirMap[s.direction] = {};
          macroMap[macroTime].dirMap[s.direction][branch] = (macroMap[macroTime].dirMap[s.direction][branch] || 0) + 1;
        }
      });
    });

    const macros = Object.entries(macroMap).map(([macroTime, data]) => {
      const total = data.entries.length;
      const branchCount = {};
      const branchR = {};
      data.entries.forEach(e => {
        branchCount[e.branch] = (branchCount[e.branch] || 0) + 1;
        if (!branchR[e.branch]) branchR[e.branch] = [];
        if (e.r != null) branchR[e.branch].push(e.r);
      });

      const branchDistribution = Object.entries(branchCount).map(([branch, count]) => ({
        branch, count,
        pct: parseFloat(((count / total) * 100).toFixed(1)),
        avgR: avg(branchR[branch] || []),
      })).sort((a, b) => b.count - a.count);

      const dayBreakdown = Object.entries(data.dayMap).map(([day, branches]) => ({
        day, branches: Object.entries(branches).map(([branch, count]) => ({ branch, count })),
      }));

      const sweepStyleBreakdown = Object.entries(data.sweepMap).map(([style, branches]) => ({
        style, branches: Object.entries(branches).map(([branch, count]) => ({ branch, count })),
      }));

      const directionBreakdown = Object.entries(data.dirMap).map(([direction, branches]) => ({
        direction, branches: Object.entries(branches).map(([branch, count]) => ({ branch, count })),
      }));

      return { macroTime, total, branchDistribution, dayBreakdown, sweepStyleBreakdown, directionBreakdown };
    }).sort((a, b) => a.macroTime.localeCompare(b.macroTime));

    const result = { macros };
    await setCached(req.userId, topicId, 'macros', result, totalEntries);
    res.json({ ...result, cached: false, computedAt: Date.now(), entryCountAtComputation: totalEntries, currentEntryCount: totalEntries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Panel 5 — Correlations
// GET /api/analytics/patterns/correlations?topicId=
// ════════════════════════════════════════════════════════════════════════════
router.get('/correlations', async (req, res) => {
  try {
    const { topicId, refresh } = req.query;
    if (!topicId) return res.status(400).json({ error: 'topicId required' });

    const totalEntries = await StudySetup.countDocuments({ topicId, userId: req.userId });
    if (totalEntries < 15) return res.json({ insufficientData: true, entryCount: totalEntries, threshold: 15 });

    if (!refresh) {
      const cached = await getCached(req.userId, topicId, 'correlations', totalEntries);
      if (cached) return res.json(cached);
    }

    const setups = await StudySetup.find({ topicId, userId: req.userId }).lean();

    // ── Corr 1: Completion Rate vs R ────────────────────────────────────────
    const crBands = { '0-50': [], '51-75': [], '76-99': [], '100': [] };
    setups.forEach(s => {
      const cr = s.completionRate;
      const r  = getRMultiple(s);
      const mfe = s.mfe ?? null;
      const mae = s.mae ?? null;
      if (cr == null) return;
      const band = cr === 100 ? '100' : cr >= 76 ? '76-99' : cr >= 51 ? '51-75' : '0-50';
      crBands[band].push({ r, mfe, mae });
    });

    const completionVsR = Object.entries(crBands).map(([band, entries]) => ({
      band,
      count: entries.length,
      avgR: avg(entries.map(e => e.r)),
      winRate: winRate(entries.map(e => e.r)),
      avgMFE: avg(entries.map(e => e.mfe)),
      avgMAE: avg(entries.map(e => e.mae)),
    })).filter(b => b.count > 0);

    // ── Corr 2: Clarity Score vs R (this topic) ──────────────────────────────
    const clarityGroups = { 1: [], 2: [], 3: [] };
    setups.forEach(s => {
      const r  = getRMultiple(s);
      const cs = s.clarityScore;
      if (!cs || !clarityGroups[cs]) return;
      clarityGroups[cs].push({ r, completionRate: s.completionRate });
    });

    const clarityVsR = [1, 2, 3].map(score => ({
      score,
      label: { 1: 'Choppy', 2: 'Readable', 3: 'Textbook' }[score],
      count: clarityGroups[score].length,
      avgR: avg(clarityGroups[score].map(e => e.r)),
      winRate: winRate(clarityGroups[score].map(e => e.r)),
      avgCompletionRate: avg(clarityGroups[score].map(e => e.completionRate)),
    })).filter(c => c.count > 0);

    // ── Corr 3: MAE vs Entry Trigger Rule ────────────────────────────────────
    const triggerMap = {};
    setups.forEach(s => {
      const mae = s.mae;
      const r   = getRMultiple(s);
      if (mae == null) return;
      const masterRules = (s.setupRules || []).filter(rule => rule?.isMasterRule);
      // First rule with a non-null firedBranch = entry trigger
      const trigger = masterRules.find(rule => getFiredBranch(rule) === 'A' || rule.checked);
      if (!trigger) return;
      const key = trigger.ruleId || trigger.text || '(untitled)';
      const label = trigger.text || key;
      if (!triggerMap[key]) triggerMap[key] = { title: label, maeValues: [], rValues: [] };
      triggerMap[key].maeValues.push(mae);
      triggerMap[key].rValues.push(r);
    });

    const maeVsEntryTrigger = Object.values(triggerMap).map(t => ({
      title: t.title,
      count: t.maeValues.length,
      avgMAE: avg(t.maeValues),
      avgR: avg(t.rValues),
    })).filter(t => t.count >= 2).sort((a, b) => (a.avgMAE || Infinity) - (b.avgMAE || Infinity));

    // ── Corr 4: MFE vs Confluence Count ─────────────────────────────────────
    const confGroups = { 1: [], 2: [], 3: [], '4+': [] };
    setups.forEach(s => {
      const mfe = s.mfe;
      const r   = getRMultiple(s);
      const allConfs = new Set();
      (s.opportunities || []).forEach(o => (o?.confluences || []).forEach(c => allConfs.add(c)));
      if (allConfs.size === 0) (s.confluences || []).forEach(c => allConfs.add(c));
      const count = allConfs.size;
      if (!count) return;
      const band = count >= 4 ? '4+' : String(count);
      confGroups[band].push({ mfe, r });
    });

    const mfeVsConfluences = Object.entries(confGroups).map(([count, entries]) => ({
      confluenceCount: count,
      count: entries.length,
      avgMFE: avg(entries.map(e => e.mfe)),
      avgR: avg(entries.map(e => e.r)),
    })).filter(c => c.count > 0);

    // ── Corr 5: News Impact ──────────────────────────────────────────────────
    const newsGroups = {};
    setups.forEach(s => {
      if (!s.newsEntries?.length) return;
      const r = getRMultiple(s);
      // Use the highest-severity news entry for this session
      const severityOrder = { Red: 3, Orange: 2, Yellow: 1 };
      const topEntry = [...s.newsEntries].sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))[0];
      const sev = topEntry?.severity;
      if (!sev) return;
      if (!newsGroups[sev]) newsGroups[sev] = { rValues: [], textbook: 0 };
      newsGroups[sev].rValues.push(r);
      if (s.outcome === 'Textbook') newsGroups[sev].textbook++;
    });

    const newsImpact = Object.keys(newsGroups).length > 0
      ? Object.entries(newsGroups).map(([severity, g]) => ({
          severity,
          count: g.rValues.length,
          avgR: avg(g.rValues),
          textbookRate: Math.round((g.textbook / g.rValues.length) * 100),
        })).sort((a, b) => b.count - a.count)
      : null;

    const result = { completionVsR, clarityVsR, maeVsEntryTrigger, mfeVsConfluences, newsImpact, entryCount: totalEntries };
    await setCached(req.userId, topicId, 'correlations', result, totalEntries);
    res.json({ ...result, cached: false, computedAt: Date.now(), entryCountAtComputation: totalEntries, currentEntryCount: totalEntries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
