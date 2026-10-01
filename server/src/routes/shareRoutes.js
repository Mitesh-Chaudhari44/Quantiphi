const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { optionalAuth } = require('../middleware/optionalAuthMiddleware');
const { createShareLink, handleShareClick, getFriendsForEvent } = require('../controllers/shareController');

const router = express.Router();

// Generate share link (POST /api/events/:eventId/share)
router.post('/events/:eventId/share', protect, createShareLink);

// Get friends count (GET /api/events/:eventId/friends)
router.get('/events/:eventId/friends', optionalAuth, getFriendsForEvent);

// Public redirect endpoint (GET /api/share/:token)
router.get('/share/:token', handleShareClick);

module.exports = router;
