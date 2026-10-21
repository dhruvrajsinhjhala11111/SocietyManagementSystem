const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notice title is required'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Notice content is required'],
  },
  attachments: [{
    type: String,
  }],
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    enum: ['general', 'maintenance', 'event', 'emergency', 'meeting', 'rules'],
    default: 'general',
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notice', noticeSchema);
