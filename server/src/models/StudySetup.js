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

    // ICT Mechanics — Macro Windows (dynamic, defined per topic)
    macroWindows: [{ type: String }],

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

    // Structured news entries (replaces legacy news string)
    newsEntries: [{
      time:        { type: String, default: '' },
      severity:    { type: String, enum: ['Red', 'Orange', 'Yellow', ''], default: '' },
      description: { type: String, default: '' },
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

    // Plan Phase 3 — Session Scoring
    clarityScore:    { type: Number, enum: [1, 2, 3], default: null },
    completionRate:  { type: Number, default: null },
    firedRulesCount: { type: Number, default: null },
    totalRulesCount: { type: Number, default: null },

    // Plan Phase 4 — Public sharing
    isPublic:   { type: Boolean, default: false },
    shareToken: { type: String, default: null, sparse: true },

    // Plan Phase 5 — Analytics fields
    date:       { type: Date },
    dayOfWeek:  { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', ''], default: '' },
    direction:  { type: String, enum: ['Bullish', 'Bearish', 'Neutral', ''], default: '' },
    sweepType2: { type: String, enum: ['Buyside', 'Sellside', 'Both', 'None', ''], default: '' },
    sweepStyle: { type: String, enum: ['Intent', 'Fakeout', 'Both', 'None', ''], default: '' },
    maxPts:     { type: Number },
  },
  { timestamps: true }
);

// Auto-derive dayOfWeek from date on every save
studySetupSchema.pre('save', function (next) {
  if (this.date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.dayOfWeek = days[new Date(this.date).getDay()] || '';
  }
  next();
});

module.exports = mongoose.model('StudySetup', studySetupSchema);
