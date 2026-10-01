const mongoose = require('mongoose');

const eventSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    venue: { type: String, default: 'Venue TBD' },
    city: { type: String, default: 'Unknown City' },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, default: '19:00' },
    imageUrl: { type: String, default: '' },
    url: { type: String, default: '' },
    category: { type: String, default: 'General' },
  },
  { _id: false }
);

const reminderSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    remindBeforeMinutes: { type: Number, default: 60 },
    notified: { type: Boolean, default: false },
  },
  { _id: false }
);

const rsvpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
    },
    eventSnapshot: {
      type: eventSnapshotSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['interested', 'confirmed'],
      required: true,
      default: 'interested',
    },
    reminder: {
      type: reminderSchema,
      default: () => ({ enabled: true, remindBeforeMinutes: 60, notified: false }),
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one RSVP per user per event
rsvpSchema.index({ user: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Rsvp', rsvpSchema);
