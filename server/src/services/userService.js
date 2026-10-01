const User = require('../models/User');

/**
 * Service to fetch user profile by ID
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user.toJSON();
};

/**
 * Service to update user profile (name, city, avatar, reminderSettings)
 */
const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (updateData.name !== undefined) user.name = updateData.name;
  if (updateData.city !== undefined) user.city = updateData.city;
  if (updateData.avatar !== undefined) user.avatar = updateData.avatar;

  if (updateData.reminderSettings) {
    if (updateData.reminderSettings.enabled !== undefined) {
      user.reminderSettings.enabled = updateData.reminderSettings.enabled;
    }
    if (updateData.reminderSettings.remindBeforeMinutes !== undefined) {
      user.reminderSettings.remindBeforeMinutes = updateData.reminderSettings.remindBeforeMinutes;
    }
  }

  await user.save();
  return user.toJSON();
};

module.exports = {
  getUserById,
  updateUserProfile,
};
