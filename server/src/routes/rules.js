const router = require('express').Router();
const auth = require('../middleware/auth');
const RuleLibrary = require('../models/RuleLibrary');
const StudyTopic = require('../models/StudyTopic');

// All routes require authentication
router.use(auth);

// ── GET /api/rules/library ─────────────────────────────────────────────────
// Returns all library rules for the authenticated user, sorted by title
router.get('/library', async (req, res) => {
  try {
    const rules = await RuleLibrary.find({ userId: req.userId }).sort({ title: 1 });
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/rules/library ────────────────────────────────────────────────
// Creates a new library rule
router.post('/library', async (req, res) => {
  try {
    const { ruleId, title, description, defaultBranchType, defaultBranchLabels, ruleType, inputType, macroTime, tags } = req.body;

    if (!ruleId?.trim()) return res.status(400).json({ error: 'ruleId is required' });
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

    // Validate ruleId format: lowercase, alphanumeric + hyphens only
    if (!/^[a-z0-9-]+$/.test(ruleId.trim())) {
      return res.status(400).json({ error: 'ruleId must contain only lowercase letters, numbers, and hyphens' });
    }

    // Check uniqueness per user
    const existing = await RuleLibrary.findOne({ userId: req.userId, ruleId: ruleId.trim() });
    if (existing) return res.status(400).json({ error: `A rule with ruleId "${ruleId.trim()}" already exists` });

    const rule = await RuleLibrary.create({
      userId: req.userId,
      ruleId: ruleId.trim(),
      title: title.trim(),
      description: description || '',
      defaultBranchType: defaultBranchType || 'none',
      defaultBranchLabels: defaultBranchLabels || [],
      ruleType: ruleType || 'conditional',
      inputType: (ruleType === 'input' && inputType) ? inputType : '',
      macroTime: (ruleType === 'macro' && macroTime) ? macroTime : null,
      tags: tags || [],
    });

    res.status(201).json({ rule });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'A rule with that ruleId already exists' });
    res.status(400).json({ error: err.message });
  }
});

// ── PUT /api/rules/library/:ruleId ─────────────────────────────────────────
// Updates a library rule (ruleId itself cannot be changed)
router.put('/library/:ruleId', async (req, res) => {
  try {
    const { title, description, defaultBranchType, defaultBranchLabels, ruleType, inputType, macroTime, tags } = req.body;

    const update = {};
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description;
    if (defaultBranchType !== undefined) update.defaultBranchType = defaultBranchType;
    if (defaultBranchLabels !== undefined) update.defaultBranchLabels = defaultBranchLabels;
    if (ruleType !== undefined) update.ruleType = ruleType;
    if (inputType !== undefined) update.inputType = inputType || '';
    if (macroTime !== undefined) update.macroTime = macroTime || null;
    if (tags !== undefined) update.tags = tags;

    const rule = await RuleLibrary.findOneAndUpdate(
      { userId: req.userId, ruleId: req.params.ruleId },
      update,
      { new: true, runValidators: true }
    );

    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ rule });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE /api/rules/library/:ruleId ──────────────────────────────────────
// Deletes a library rule only if it is not referenced in any topic's masterRules
router.delete('/library/:ruleId', async (req, res) => {
  try {
    const rule = await RuleLibrary.findOne({ userId: req.userId, ruleId: req.params.ruleId });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    // Check if this ruleId is referenced in any topic's masterRules
    const topics = await StudyTopic.find({
      userId: req.userId,
      'masterRules.ruleId': req.params.ruleId,
    }).select('name');

    if (topics.length > 0) {
      const topicNames = topics.map((t) => t.name).join(', ');
      return res.status(400).json({
        error: `This rule is used in the following topics: ${topicNames}. Remove it from those topics before deleting.`,
      });
    }

    await RuleLibrary.deleteOne({ userId: req.userId, ruleId: req.params.ruleId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/rules/library/bulk ───────────────────────────────────────────
// Bulk-create rules from a JSON array. Skips duplicates, reports per-rule errors.
router.post('/library/bulk', async (req, res) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ error: 'Request body must contain a non-empty "rules" array' });
    }
    if (rules.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 rules per bulk import' });
    }

    const created = [];
    const skipped = [];
    const errors = [];

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      const label = r.ruleId || r.title || `rule[${i}]`;

      // Validate required fields
      if (!r.ruleId?.trim()) {
        errors.push({ index: i, rule: label, error: 'ruleId is required' });
        continue;
      }
      if (!r.title?.trim()) {
        errors.push({ index: i, rule: label, error: 'title is required' });
        continue;
      }

      const ruleId = r.ruleId.trim().toLowerCase();

      // Validate ruleId format
      if (!/^[a-z0-9-]+$/.test(ruleId)) {
        errors.push({ index: i, rule: label, error: 'ruleId must contain only lowercase letters, numbers, and hyphens' });
        continue;
      }

      // Check for duplicates (against DB + already-created in this batch)
      const existing = await RuleLibrary.findOne({ userId: req.userId, ruleId });
      if (existing || created.some(c => c.ruleId === ruleId)) {
        skipped.push({ index: i, ruleId, title: r.title, reason: 'Already exists' });
        continue;
      }

      try {
        const rule = await RuleLibrary.create({
          userId: req.userId,
          ruleId,
          title: r.title.trim(),
          description: r.description || '',
          defaultBranchType: r.defaultBranchType || 'none',
          defaultBranchLabels: r.defaultBranchLabels || [],
          ruleType: r.ruleType || 'conditional',
          inputType: (r.ruleType === 'input' && r.inputType) ? r.inputType : '',
          macroTime: (r.ruleType === 'macro' && r.macroTime) ? r.macroTime : null,
          tags: r.tags || [],
          mlRegistryId: r.mlRegistryId || null,
        });
        created.push(rule);
      } catch (err) {
        errors.push({ index: i, rule: label, error: err.message });
      }
    }

    res.status(201).json({
      summary: {
        submitted: rules.length,
        created: created.length,
        skipped: skipped.length,
        failed: errors.length,
      },
      created: created.map(r => ({ ruleId: r.ruleId, title: r.title })),
      skipped,
      errors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
