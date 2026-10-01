const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const eventRoutes = require('./eventRoutes');
const rsvpRoutes = require('./rsvpRoutes');
const shareRoutes = require('./shareRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/rsvps', rsvpRoutes);
router.use('/', shareRoutes); // Exposes POST /events/:eventId/share, GET /events/:eventId/friends, GET /share/:token

module.exports = router;
