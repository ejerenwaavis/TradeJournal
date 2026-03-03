const mongoose = require('mongoose');

const backTestProjectSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    strategy:    { type: String, default: '' },   // e.g. "Silver Bullet", "MMXM"
    instrument:  { type: String, default: '', uppercase: true },
    targetWinRate: { type: Number },              // e.g. 0.6 for 60%
    targetRR:      { type: Number },              // e.g. 2.0
  },
  { timestamps: true }
);

module.exports = mongoose.model('BacktestProject', backTestProjectSchema);
