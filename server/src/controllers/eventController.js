const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const eventService = require('../services/eventService');

/**
 * @desc    Get paginated events feed with search & filter parameters
 * @route   GET /api/events
 * @access  Public (Optional Auth)
 */
const getEvents = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const result = await eventService.getEventsList({ queryParams: req.query, userId });
  return sendSuccess(res, 200, result, 'Events retrieved successfully');
});

/**
 * @desc    Get monthly calendar event counts [{ date, count }]
 * @route   GET /api/events/calendar
 * @access  Public (Optional Auth)
 */
const getCalendarEvents = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const { month, city, category } = req.query;
  const result = await eventService.getCalendarCounts({ month, city, category, userId });
  return sendSuccess(res, 200, result, 'Calendar event counts retrieved successfully');
});

/**
 * @desc    Get single event detail by event ID
 * @route   GET /api/events/:eventId
 * @access  Public (Optional Auth)
 */
const getEventById = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const { eventId } = req.params;
  const event = await eventService.getSingleEventDetail({ eventId, userId });
  return sendSuccess(res, 200, event, 'Event detail retrieved successfully');
});

module.exports = {
  getEvents,
  getCalendarEvents,
  getEventById,
};
