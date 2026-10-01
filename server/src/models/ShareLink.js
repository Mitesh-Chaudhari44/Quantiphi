const mongoose = require('mongoose');
const crypto = require('crypto');

const clickSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    visitorId: {
      type: String,
      required: true,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const shareLinkSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(6).toString('hex'), // Unique 12-char token
    },
    eventId: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventSnapshot: {
      title: String,
      venue: String,
      city: String,
      date: String,
      time: String,
      imageUrl: String,
      url: String,
    },
    clicks: [clickSchema],
    uniqueClickCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on (owner, eventId)
shareLinkSchema.index({ owner: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('ShareLink', shareLinkSchema);
