const mongoose = require('mongoose');

const analyticsCacheSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, required: true },
  panel:   { type: String, required: true, enum: ['rules', 'sequences', 'narrative', 'macros', 'correlations'] },
  data:    { type: mongoose.Schema.Types.Mixed },
  computedAt:             { type: Date, default: Date.now },
  entryCountAtComputation:{ type: Number },
});

analyticsCacheSchema.index({ userId: 1, topicId: 1, panel: 1 }, { unique: true });
// Auto-expire documents after 24 hours
analyticsCacheSchema.index({ computedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('AnalyticsCache', analyticsCacheSchema);
