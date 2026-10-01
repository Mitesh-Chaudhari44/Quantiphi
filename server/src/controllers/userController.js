const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const userService = require('../services/userService');

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/users/me
 * @access  Private
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  return sendSuccess(res, 200, user, 'User profile retrieved successfully');
});

/**
 * @desc    Update current authenticated user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
const updateCurrentUser = asyncHandler(async (req, res) => {
  const { name, city, avatar, reminderSettings } = req.body;
  const updatedUser = await userService.updateUserProfile(req.user.id, {
    name,
    city,
    avatar,
    reminderSettings,
  });
  return sendSuccess(res, 200, updatedUser, 'Profile updated successfully');
});

module.exports = {
  getCurrentUser,
  updateCurrentUser,
};
