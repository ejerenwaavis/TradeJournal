const mongoose = require('mongoose');

const studyTopicSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tags:        [{ type: String }],
    color:       { type: String, default: '#6366f1' }, // indigo default
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudyTopic', studyTopicSchema);
