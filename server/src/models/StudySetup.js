const mongoose = require('mongoose');

const studySetupSchema = new mongoose.Schema(
  {
    topicId:    { type: mongoose.Schema.Types.ObjectId, ref: 'StudyTopic', required: true, index: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title:      { type: String, default: '' },

    // Chart
    tvLink:        { type: String, default: '' },
    chartImageUrl: { type: String, default: '' },

    // Setup details
    setupRules:  [{ type: String }],
    confluences: [{ type: String }],
    bias:        { type: String, enum: ['Bullish', 'Bearish', 'Neutral', ''], default: '' },
    session:     { type: String, enum: ['Asia', 'London', 'New York', 'London-NY Overlap', ''], default: '' },
    timeOfTrade: { type: String, default: '' }, // HH:MM
    maxRun:      { type: Number },

    // Outcome
    outcome:   { type: String, enum: ['Textbook', 'Partial', 'Failed', 'Pending', ''], default: '' },
    narrative: { type: String, default: '' },
    notes:     { type: String, default: '' },

    // Optional link to an actual trade log entry
    linkedTradeLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudySetup', studySetupSchema);
