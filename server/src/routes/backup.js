const router = require('express').Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const { stringify } = require('csv-stringify');
const { parse } = require('csv-parse');
const Trade = require('../models/Trade');
const StudyTopic = require('../models/StudyTopic');
const StudySetup = require('../models/StudySetup');
const { signRow, verifyRow } = require('../utils/csvSigner');

const SECRET = () => {
  const s = process.env.BACKUP_SIGNING_SECRET;
  if (!s) throw new Error('BACKUP_SIGNING_SECRET env var not set');
  return s;
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Helper: stream array to CSV string with _sig column ───────────────────
function toSignedCsvBuffer(rows) {
  return new Promise((resolve, reject) => {
    if (!rows.length) { resolve(Buffer.from('')); return; }
    const signed = rows.map((r) => {
      const row = { ...r };
      row._sig = signRow(r, SECRET());
      return row;
    });
    const headers = Object.keys(signed[0]);
    stringify(signed, { header: true, columns: headers }, (err, out) => {
      if (err) reject(err);
      else resolve(Buffer.from(out, 'utf-8'));
    });
  });
}

// ── Helper: parse CSV buffer and verify each row ──────────────────────────
function parseAndVerify(buffer) {
  return new Promise((resolve, reject) => {
    parse(buffer.toString('utf-8'), { columns: true, trim: true }, (err, records) => {
      if (err) return reject(err);
      const failed = records.filter((r) => !verifyRow(r, SECRET()));
      if (failed.length > 0) return reject(new Error('INTEGRITY_FAIL'));
      resolve(records.map(({ _sig, ...rest }) => rest));
    });
  });
}

const dateStr = () => new Date().toISOString().slice(0, 10);

// ════════════════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════════════════

// GET /api/backup/export/trades
router.get('/export/trades', auth, async (req, res) => {
  try {
    const trades = await Trade.find({ userId: req.userId }).lean();
    const rows = trades.map((t) => ({
      _id:              String(t._id),
      instrument:       t.instrument || '',
      assetClass:       t.assetClass || '',
      direction:        t.direction || '',
      entryPrice:       t.entryPrice ?? '',
      stopLoss:         t.stopLoss ?? '',
      takeProfit1:      t.takeProfit1 ?? '',
      takeProfit2:      t.takeProfit2 ?? '',
      riskReward:       t.riskReward ?? '',
      status:           t.status || '',
      exitPrice:        t.exitPrice ?? '',
      pnlPips:          t.pnlPips ?? '',
      result:           t.result || '',
      lotSize:          t.lotSize ?? '',
      entryDate:        t.entryDate ? new Date(t.entryDate).toISOString() : '',
      exitDate:         t.exitDate ? new Date(t.exitDate).toISOString() : '',
      timeframe:        t.timeframe || '',
      setupType:        t.setupType || '',
      confluences:      (t.confluences || []).join('|'),
      session:          t.session || '',
      emotionPreTrade:  t.emotionPreTrade || '',
      emotionPostTrade: t.emotionPostTrade || '',
      executionRating:  t.executionRating ?? '',
      preTradeNotes:    t.preTradeNotes || '',
      postTradeNotes:   t.postTradeNotes || '',
      htfBias:          t.htfBias || '',
      tradeType:        t.tradeType || '',
      charts:           JSON.stringify(t.charts || []),
    }));
    const buf = await toSignedCsvBuffer(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tradelog-backup-${dateStr()}.csv"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/export/study
router.get('/export/study', auth, async (req, res) => {
  try {
    const topics = await StudyTopic.find({ userId: req.userId }).lean();
    const setups = await StudySetup.find({ userId: req.userId }).lean();

    const topicRows = topics.map((t) => ({
      _type:       'topic',
      _id:         String(t._id),
      name:        t.name || '',
      description: t.description || '',
      tags:        (t.tags || []).join('|'),
      color:       t.color || '',
      createdAt:   new Date(t.createdAt).toISOString(),
    }));
    const setupRows = setups.map((s) => ({
      _type:          'setup',
      _id:            String(s._id),
      topicId:        String(s.topicId),
      title:          s.title || '',
      tvLink:         s.tvLink || '',
      chartImageUrl:  s.chartImageUrl || '',
      setupRules:     (s.setupRules || []).join('||'),
      confluences:    (s.confluences || []).join('|'),
      bias:           s.bias || '',
      session:        s.session || '',
      timeOfTrade:    s.timeOfTrade || '',
      maxRun:         s.maxRun ?? '',
      outcome:        s.outcome || '',
      narrative:      s.narrative || '',
      notes:          s.notes || '',
      linkedTradeLogId: s.linkedTradeLogId ? String(s.linkedTradeLogId) : '',
      createdAt:      new Date(s.createdAt).toISOString(),
    }));

    const buf = await toSignedCsvBuffer([...topicRows, ...setupRows]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="study-backup-${dateStr()}.csv"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// IMPORT
// ════════════════════════════════════════════════════════════════════════════

// POST /api/backup/import  — multipart: field "file"
router.post('/import', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let records;
  try {
    records = await parseAndVerify(req.file.buffer);
  } catch (err) {
    if (err.message === 'INTEGRITY_FAIL') {
      return res.status(400).json({
        error: 'Backup file integrity check failed. This file may have been tampered with.',
      });
    }
    return res.status(400).json({ error: `CSV parse error: ${err.message}` });
  }

  let imported = 0, skipped = 0;
  const errors = [];

  // Detect type from columns
  const isTrade  = records[0] && records[0].instrument !== undefined;
  const isStudy  = records[0] && records[0]._type !== undefined;

  try {
    if (isTrade) {
      for (const r of records) {
        try {
          await Trade.findOneAndUpdate(
            { _id: r._id, userId: req.userId },
            {
              userId: req.userId,
              instrument:       r.instrument,
              assetClass:       r.assetClass,
              direction:        r.direction,
              entryPrice:       r.entryPrice !== '' ? Number(r.entryPrice) : undefined,
              stopLoss:         r.stopLoss   !== '' ? Number(r.stopLoss)   : undefined,
              takeProfit1:      r.takeProfit1 !== '' ? Number(r.takeProfit1) : undefined,
              riskReward:       r.riskReward !== '' ? Number(r.riskReward) : undefined,
              status:           r.status,
              exitPrice:        r.exitPrice !== '' ? Number(r.exitPrice) : undefined,
              pnlPips:          r.pnlPips   !== '' ? Number(r.pnlPips)   : undefined,
              result:           r.result,
              entryDate:        r.entryDate || undefined,
              exitDate:         r.exitDate  || undefined,
              timeframe:        r.timeframe,
              setupType:        r.setupType,
              confluences:      r.confluences ? r.confluences.split('|').filter(Boolean) : [],
              session:          r.session,
              preTradeNotes:    r.preTradeNotes,
              postTradeNotes:   r.postTradeNotes,
              htfBias:          r.htfBias,
              tradeType:        r.tradeType,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          imported++;
        } catch (e) {
          skipped++;
          errors.push(`Trade ${r._id}: ${e.message}`);
        }
      }
    } else if (isStudy) {
      // First pass: topics
      for (const r of records.filter((r) => r._type === 'topic')) {
        try {
          await StudyTopic.findOneAndUpdate(
            { _id: r._id, userId: req.userId },
            { userId: req.userId, name: r.name, description: r.description, tags: r.tags ? r.tags.split('|').filter(Boolean) : [], color: r.color },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          imported++;
        } catch (e) { skipped++; errors.push(`Topic ${r._id}: ${e.message}`); }
      }
      // Second pass: setups
      for (const r of records.filter((r) => r._type === 'setup')) {
        try {
          await StudySetup.findOneAndUpdate(
            { _id: r._id, userId: req.userId },
            {
              userId: req.userId,
              topicId:       r.topicId,
              title:         r.title,
              tvLink:        r.tvLink,
              chartImageUrl: r.chartImageUrl,
              setupRules:    r.setupRules  ? r.setupRules.split('||').filter(Boolean)  : [],
              confluences:   r.confluences ? r.confluences.split('|').filter(Boolean)  : [],
              bias:          r.bias,
              session:       r.session,
              timeOfTrade:   r.timeOfTrade,
              maxRun:        r.maxRun !== '' ? Number(r.maxRun) : undefined,
              outcome:       r.outcome,
              narrative:     r.narrative,
              notes:         r.notes,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          imported++;
        } catch (e) { skipped++; errors.push(`Setup ${r._id}: ${e.message}`); }
      }
    } else {
      return res.status(400).json({ error: 'Unrecognised CSV format' });
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
