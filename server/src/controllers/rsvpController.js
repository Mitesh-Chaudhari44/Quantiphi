const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const rsvpService = require('../services/rsvpService');

const createRsvp = asyncHandler(async (req, res) => {
  const { eventId, status } = req.body;
  const result = await rsvpService.createOrUpdateRsvp({
    userId: req.user.id,
    eventId,
    status,
  });
  return sendSuccess(res, 201, result, 'RSVP created/updated successfully');
});

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

const updateRsvpReminderSettings = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { enabled, remindBeforeMinutes } = req.body;
  const result = await rsvpService.updateRsvpReminder({
    userId: req.user.id,
    eventId,
    enabled,
    remindBeforeMinutes,
  });
  return sendSuccess(res, 200, result, 'Reminder settings updated successfully');
});

const deleteRsvp = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const result = await rsvpService.deleteRsvp({
    userId: req.user.id,
    eventId,
  });
  return sendSuccess(res, 200, result, 'RSVP removed successfully');
});

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
  updateRsvpReminderSettings,
  deleteRsvp,
  getRsvps,
};
