const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');

const getNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.getUserNotifications(req.user.id);
  return sendSuccess(res, 200, data, 'Notifications retrieved successfully');
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await notificationService.markAsRead(req.user.id, id);
  return sendSuccess(res, 200, updated, 'Notification marked as read');
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  return sendSuccess(res, 200, null, 'All notifications marked as read');
});

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
