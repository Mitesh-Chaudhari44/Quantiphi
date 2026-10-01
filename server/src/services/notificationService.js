const Notification = require('../models/Notification');

/**
 * Get user notifications sorted by createdAt descending
 */
const getUserNotifications = async (userId) => {
  const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
  const unreadCount = notifications.filter((n) => !n.read).length;
  return {
    notifications,
    unreadCount,
  };
};

/**
 * Mark single notification as read
 */
const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }
  return notification;
};

/**
 * Mark all user notifications as read
 */
const markAllAsRead = async (userId) => {
  await Notification.updateMany({ user: userId, read: false }, { read: true });
  return { success: true };
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
