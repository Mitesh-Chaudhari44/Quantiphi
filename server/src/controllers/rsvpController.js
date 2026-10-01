const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const rsvpService = require('../services/rsvpService');

/**
 * @desc    Create or update RSVP for an event
 * @route   POST /api/rsvps
 * @access  Private
 */
const createRsvp = asyncHandler(async (req, res) => {
  const { eventId, status } = req.body;
  const result = await rsvpService.createOrUpdateRsvp({
    userId: req.user.id,
    eventId,
    status,
  });
  return sendSuccess(res, 201, result, 'RSVP created/updated successfully');
});

/**
 * @desc    Update RSVP status ('interested' -> 'confirmed' or vice versa)
 * @route   PATCH /api/rsvps/:eventId
 * @access  Private
 */
const updateRsvp = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { status } = req.body;
  const result = await rsvpService.updateRsvpStatus({
    userId: req.user.id,
    eventId,
    status,
  });
  return sendSuccess(res, 200, result, 'RSVP status updated successfully');
});

/**
 * @desc    Delete / Cancel an RSVP
 * @route   DELETE /api/rsvps/:eventId
 * @access  Private
 */
const deleteRsvp = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const result = await rsvpService.deleteRsvp({
    userId: req.user.id,
    eventId,
  });
  return sendSuccess(res, 200, result, 'RSVP removed successfully');
});

/**
 * @desc    Get current user's RSVPs (filtered by status & upcoming/past)
 * @route   GET /api/rsvps
 * @access  Private
 */
const getRsvps = asyncHandler(async (req, res) => {
  const { status, when } = req.query;
  const rsvps = await rsvpService.getUserRsvps({
    userId: req.user.id,
    status,
    when,
  });
  return sendSuccess(res, 200, rsvps, 'RSVPs retrieved successfully');
});

module.exports = {
  createRsvp,
  updateRsvp,
  deleteRsvp,
  getRsvps,
};
