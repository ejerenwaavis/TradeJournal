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
    setupRules:  [{ type: mongoose.Schema.Types.Mixed }], // { text: String, subs: [String] } or legacy String
    confluences: [{ type: String }],
    bias:        { type: String, enum: ['Bullish', 'Bearish', 'Neutral', ''], default: '' },
    session:     { type: String, enum: ['Asia', 'London', 'New York', 'London-NY Overlap', ''], default: '' },
    timeOfTrade: { type: String, default: '' }, // HH:MM
    maxRun:      { type: Number },

    // Outcome
    outcome:   { type: String, enum: ['Textbook', 'Partial', 'Failed', 'Pending', ''], default: '' },
    narrative: { type: String, default: '' },
    notes:     { type: String, default: '' },

    // ICT Mechanics — Macro Windows
    macroWindows: [{ type: String, enum: ['7:30','7:50','8:10','8:30','8:50'] }],

    // ICT Mechanics — Liquidity Profile
    liquiditySwept:  [{ type: String }],
    sweepType:       { type: String, enum: ['Wick Sweep', 'Body Sweep', 'Both', ''], default: '' },
    sweepDirection:  { type: String, enum: ['Sellside Taken', 'Buyside Taken', ''], default: '' },
    targetLiquidity: { type: String, default: '' },

    // ICT Mechanics — FVG / PD Array
    pdArray:      { type: String, default: '' },
    pdArrayLevel: { type: String, default: '' },
    returnToPD:   { type: Boolean, default: false },
    entryTrigger: { type: String, default: '' },

    // ICT Mechanics — Market Structure
    mssDirection:  { type: String, enum: ['Bullish MSS', 'Bearish MSS', ''], default: '' },
    mssTime:       { type: String, default: '' },
    engineeredLiq: { type: Boolean, default: false },

    // ICT Mechanics — Target & Result
    targetLevel:   { type: String, default: '' },
    stalledAt:     { type: String, default: '' },
    reachedTarget: { type: Boolean, default: false },

    // Optional link to an actual trade log entry
    linkedTradeLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade', default: null },

    // Phase 3 — Multi-image gallery
    chartImages: [{
      url:     { type: String },
      caption: { type: String, default: '' },
      order:   { type: Number, default: 0 },
    }],

    // Phase 2 — Variable discoveries
    discoveries: [{
      text:     { type: String },
      promoted: { type: Boolean, default: false },
    }],

    // Phase 4 — Structured event timeline
    events: [{
      time:        { type: String, default: '' },
      type:        { type: String, default: 'Other' },
      description: { type: String, default: '' },
    }],

    // Phase 5 — Quantifiable metrics
    mfe:      { type: Number },
    mae:      { type: Number },
    rMultiple: { type: Number },
    entryLevel: { type: Number },
    stopLevel:  { type: Number },

    // Phase 5 — Additional ICT qualifiers
    liquidityQuality: { type: String, enum: ['Minor', 'Major', ''], default: '' },
    closeBelowCE:     { type: Boolean, default: false },

    // Multi-opportunity — multiple trade entries per study sample
    opportunities: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudySetup', studySetupSchema);
