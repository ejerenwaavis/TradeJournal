const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true }, // Markdown narrative from GPT-4o
    tradeCount: { type: Number }, // how many trades were analyzed
    periodLabel: { type: String, default: 'Last 30 days' },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Insight', insightSchema);
