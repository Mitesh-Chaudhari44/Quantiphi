const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { checkAndTriggerReminders } = require('../jobs/reminderJob');

/**
 * @desc    Dev-only endpoint to trigger reminder check job manually
 * @route   POST /api/dev/trigger-reminders
 * @access  Public / Dev Only
 */
const triggerRemindersManually = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 403, 'Dev endpoints are disabled in production environment');
  }

  const result = await checkAndTriggerReminders();
  return sendSuccess(res, 200, result, `Reminder job executed manually. Triggered ${result.triggeredCount} notifications.`);
});

module.exports = {
  triggerRemindersManually,
};
