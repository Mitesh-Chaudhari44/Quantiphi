const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const shareService = require('../services/shareService');

/**
 * @desc    Generate a shareable invite link for an event (requires active RSVP)
 * @route   POST /api/events/:eventId/share
 * @access  Private
 */
const createShareLink = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const result = await shareService.generateShareLink({
    userId: req.user.id,
    eventId,
  });
  return sendSuccess(res, 201, result, 'Share link generated successfully');
});

/**
 * @desc    Process public click on share link & redirect to client app
 * @route   GET /api/share/:token
 * @access  Public
 */
const handleShareClick = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // 1. Get or create visitorId cookie
  let visitorId = req.cookies ? req.cookies.visitorId : null;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    res.cookie('visitorId', visitorId, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      sameSite: 'lax',
    });
  }

  // 2. Extract visitor userId if token provided in query ?t= or Authorization header
  let visitorUserId = null;
  let jwtToken = req.query.t || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (jwtToken) {
    try {
      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'super_secret_jwt_key_event_finder_2026');
      visitorUserId = decoded.id;
    } catch (e) {
      visitorUserId = null;
    }
  }

  // 3. Process click atomically
  const result = await shareService.processShareLinkClick({
    token,
    visitorUserId,
    visitorId,
  });

  return res.redirect(result.redirectUrl);
});

/**
 * @desc    Get count of friends attending for an event
 * @route   GET /api/events/:eventId/friends
 * @access  Private / Optional Auth
 */
const getFriendsForEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user ? req.user.id : null;
  const count = await shareService.getFriendsAttendingCount({ userId, eventId });
  return sendSuccess(res, 200, { eventId, count }, 'Friends attending count retrieved');
});

module.exports = {
  createShareLink,
  handleShareClick,
  getFriendsForEvent,
};
