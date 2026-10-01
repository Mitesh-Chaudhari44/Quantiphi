const ShareLink = require('../models/ShareLink');
const Rsvp = require('../models/Rsvp');
const ticketmasterService = require('./ticketmasterService');

/**
 * Generate or retrieve existing share link for an event (Auth required; must have RSVP)
 */
const generateShareLink = async ({ userId, eventId }) => {
  const rsvp = await Rsvp.findOne({ user: userId, eventId });
  if (!rsvp) {
    const error = new Error('You must RSVP to this event before you can generate a share link');
    error.statusCode = 403;
    throw error;
  }

  let shareLink = await ShareLink.findOne({ owner: userId, eventId });

  if (!shareLink) {
    const event = await ticketmasterService.fetchEventById(eventId);
    const eventSnapshot = event
      ? {
          title: event.title,
          venue: event.venue,
          city: event.city,
          date: event.date,
          time: event.time,
          imageUrl: event.imageUrl,
          url: event.url,
        }
      : {};

    shareLink = await ShareLink.create({
      owner: userId,
      eventId,
      eventSnapshot,
    });
  }

  const serverPublicUrl = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  const fullUrl = `${serverPublicUrl}/api/share/${shareLink.token}`;

  return {
    token: shareLink.token,
    fullUrl,
    eventId: shareLink.eventId,
    uniqueClickCount: shareLink.uniqueClickCount,
  };
};

/**
 * Process public click on share link with atomic uniqueness check & real-time socket notification
 */
const processShareLinkClick = async ({ token, visitorUserId = null, visitorId }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const shareLink = await ShareLink.findOne({ token });
  if (!shareLink) {
    return { valid: false, redirectUrl: `${clientUrl}/events` };
  }

  const ownerIdStr = shareLink.owner.toString();
  const visitorUserIdStr = visitorUserId ? visitorUserId.toString() : null;

  if (visitorUserIdStr && visitorUserIdStr === ownerIdStr) {
    return {
      valid: true,
      eventId: shareLink.eventId,
      redirectUrl: `${clientUrl}/events/${shareLink.eventId}?ref=${token}`,
    };
  }

  const matchCondition = {
    token,
    'clicks.visitorId': { $ne: visitorId },
  };

  if (visitorUserIdStr) {
    matchCondition.owner = { $ne: visitorUserIdStr };
    matchCondition['clicks.userId'] = { $ne: visitorUserIdStr };
  }

  const updatedLink = await ShareLink.findOneAndUpdate(
    matchCondition,
    {
      $push: {
        clicks: {
          userId: visitorUserId || null,
          visitorId,
          clickedAt: new Date(),
        },
      },
      $inc: { uniqueClickCount: 1 },
    },
    { new: true }
  );

  // Late-require socketManager to avoid circular dependency
  if (updatedLink) {
    const { emitToUserRoom } = require('../sockets/socketManager');
    emitToUserRoom(updatedLink.owner, 'friends:updated', {
      eventId: updatedLink.eventId,
      count: updatedLink.uniqueClickCount,
    });
  }

  return {
    valid: true,
    eventId: shareLink.eventId,
    redirectUrl: `${clientUrl}/events/${shareLink.eventId}?ref=${token}`,
  };
};

const getFriendsAttendingCount = async ({ userId, eventId }) => {
  if (!userId || !eventId) return 0;
  const link = await ShareLink.findOne({ owner: userId, eventId });
  return link ? link.uniqueClickCount : 0;
};

const getFriendsAttendingMap = async ({ userId, eventIds = [] }) => {
  if (!userId || eventIds.length === 0) return {};
  const links = await ShareLink.find({ owner: userId, eventId: { $in: eventIds } });

  const map = {};
  links.forEach((l) => {
    map[l.eventId] = l.uniqueClickCount || 0;
  });
  return map;
};

module.exports = {
  generateShareLink,
  processShareLinkClick,
  getFriendsAttendingCount,
  getFriendsAttendingMap,
};
