const mongoose = require('mongoose');

const studyTopicSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tags:        [{ type: String }],
    color:       { type: String, default: '#6366f1' }, // indigo default
    masterRules: [{ type: mongoose.Schema.Types.Mixed }], // { text, subs, scenarios: [{ name }] }

    // Custom macro windows for this topic (e.g. ['9:30','9:50','10:10','10:50','11:10'])
    macroWindows: [{ type: String }],

    // Controls which ICT mechanics sections appear in setup forms
    studyParameters: {
      showLiquidity:       { type: Boolean, default: true },
      showMarketStructure: { type: Boolean, default: true },
      showPDArray:         { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyTopic', studyTopicSchema);
