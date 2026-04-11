const mongoose = require('mongoose');

const ruleLibrarySchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ruleId:   { type: String, required: true, trim: true },
    title:    { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    defaultBranchType:   { type: String, enum: ['none', 'single', 'fork'], default: 'none' },
    defaultBranchLabels: { type: [String], validate: { validator: (v) => v.length <= 2, message: 'Max 2 branch labels' } },

    ruleType:  { type: String, enum: ['conditional', 'macro'], required: true, default: 'conditional' },
    macroTime: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          if (this.ruleType === 'macro') return !!v && v.trim().length > 0;
          return v == null || v === '';
        },
        message: 'macroTime is required for macro rules and must be null for conditional rules',
      },
    },

    tags: [{ type: String }],
  },
  { timestamps: true }
);

// ruleId must be unique per user
ruleLibrarySchema.index({ userId: 1, ruleId: 1 }, { unique: true });

module.exports = mongoose.model('RuleLibrary', ruleLibrarySchema);
