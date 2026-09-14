const mongoose = require('mongoose');

const studyTopicSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tags:        [{ type: String }],
    color:       { type: String, default: '#6366f1' }, // indigo default
    masterRules: [{ type: mongoose.Schema.Types.Mixed }], // { text, ruleId, isFromLibrary, ruleType, macroTime, branchType, branchLabels, sortOrder }

    // Custom macro windows for this topic (e.g. ['9:30','9:50','10:10','10:50','11:10'])
    macroWindows: [{ type: String }],

    // Controls which sections and mechanics appear in setup forms when taking notes
    studyParameters: {
      showLiquidity:           { type: Boolean, default: false },
      showMarketStructure:     { type: Boolean, default: false },
      showPDArray:             { type: Boolean, default: false },
      showMacroWindows:        { type: Boolean, default: false },
      showTradeOpportunities:  { type: Boolean, default: false },
      showMlParameters:        { type: Boolean, default: false },
      showNews:                { type: Boolean, default: false },
      showDiscoveries:         { type: Boolean, default: false },
      showSessionClarity:      { type: Boolean, default: false },
      showAnalytics:           { type: Boolean, default: false },
      showObservations:        { type: Boolean, default: false },
      showNarrative:           { type: Boolean, default: false },
      showNotes:               { type: Boolean, default: true },
    },

    // Topic-level public sharing
    isPublic:   { type: Boolean, default: false },
    shareToken: { type: String, unique: true, sparse: true },  // stable UUID for browser link
    apiKey:     { type: String, unique: true, sparse: true },  // resource key for API access (never logged)
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyTopic', studyTopicSchema);
