const Rsvp = require('../models/Rsvp');
const User = require('../models/User');
const ticketmasterService = require('./ticketmasterService');
const shareService = require('./shareService');

const calculateDaysLeft = (eventDateStr) => {
  if (!eventDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(`${eventDateStr}T00:00:00`);
  const diffTime = eventDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const createOrUpdateRsvp = async ({ userId, eventId, status = 'interested' }) => {
  const event = await ticketmasterService.fetchEventById(eventId);
  if (!event) {
    const error = new Error(`Event with ID '${eventId}' not found`);
    error.statusCode = 404;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const reminderDefaults = {
    enabled: user.reminderSettings?.enabled ?? true,
    remindBeforeMinutes: user.reminderSettings?.remindBeforeMinutes ?? 60,
    notified: false,
  };

  const eventSnapshot = {
    title: event.title,
    venue: event.venue,
    city: event.city,
    date: event.date,
    time: event.time,
    imageUrl: event.imageUrl,
    url: event.url,
    category: event.category || 'General',
  };

  const rsvp = await Rsvp.findOneAndUpdate(
    { user: userId, eventId },
    {
      $set: {
        status,
        eventSnapshot,
      },
      $setOnInsert: {
        reminder: reminderDefaults,
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  const daysLeft = calculateDaysLeft(rsvp.eventSnapshot.date);
  const friendsAttending = await shareService.getFriendsAttendingCount({ userId, eventId });

  return {
    ...rsvp.toJSON(),
    daysLeft,
    friendsAttending,
  };
};

const updateRsvpStatus = async ({ userId, eventId, status }) => {
  const rsvp = await Rsvp.findOne({ user: userId, eventId });
  if (!rsvp) {
    const error = new Error(`RSVP record for event '${eventId}' not found`);
    error.statusCode = 404;
    throw error;
  }

  rsvp.status = status;
  await rsvp.save();

  const daysLeft = calculateDaysLeft(rsvp.eventSnapshot.date);
  const friendsAttending = await shareService.getFriendsAttendingCount({ userId, eventId });

  return {
    ...rsvp.toJSON(),
    daysLeft,
    friendsAttending,
  };
};

const deleteRsvp = async ({ userId, eventId }) => {
  const rsvp = await Rsvp.findOneAndDelete({ user: userId, eventId });
  if (!rsvp) {
    const error = new Error(`RSVP record for event '${eventId}' not found`);
    error.statusCode = 404;
    throw error;
  }

  return { eventId, removed: true };
};

const getUserRsvps = async ({ userId, status, when }) => {
  const query = { user: userId };

  if (status) {
    query.status = status;
  }

  const rsvps = await Rsvp.find(query).lean();
  const eventIds = rsvps.map((r) => r.eventId);
  const friendsMap = await shareService.getFriendsAttendingMap({ userId, eventIds });

  let enrichedRsvps = rsvps.map((rsvp) => {
    const daysLeft = calculateDaysLeft(rsvp.eventSnapshot?.date);
    return {
      ...rsvp,
      daysLeft,
      friendsAttending: friendsMap[rsvp.eventId] || 0,
    };
  });

  if (when === 'upcoming') {
    enrichedRsvps = enrichedRsvps.filter((r) => r.daysLeft >= 0);
    enrichedRsvps.sort((a, b) => new Date(a.eventSnapshot.date) - new Date(b.eventSnapshot.date));
  } else if (when === 'past') {
    enrichedRsvps = enrichedRsvps.filter((r) => r.daysLeft < 0);
    enrichedRsvps.sort((a, b) => new Date(b.eventSnapshot.date) - new Date(a.eventSnapshot.date));
  } else {
    enrichedRsvps.sort((a, b) => new Date(a.eventSnapshot.date) - new Date(a.eventSnapshot.date));
  }

  return enrichedRsvps;
};

module.exports = {
  createOrUpdateRsvp,
  updateRsvpStatus,
  deleteRsvp,
  getUserRsvps,
  calculateDaysLeft,
};
