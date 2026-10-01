const ChatMessage = require('../models/ChatMessage');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * @desc    Get recent chat message history for current user
 * @route   GET /api/chat/history
 * @access  Private
 */
const getChatHistory = asyncHandler(async (req, res) => {
  const messages = await ChatMessage.find({ user: req.user.id })
    .sort({ createdAt: 1 })
    .limit(50);

  return sendSuccess(res, 200, messages, 'Chat history retrieved successfully');
});

module.exports = {
  getChatHistory,
};
