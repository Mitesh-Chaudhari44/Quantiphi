const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const eventRoutes = require('./eventRoutes');
const rsvpRoutes = require('./rsvpRoutes');
const shareRoutes = require('./shareRoutes');
const notificationRoutes = require('./notificationRoutes');
const devRoutes = require('./devRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/rsvps', rsvpRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dev', devRoutes);
router.use('/', shareRoutes);

module.exports = router;
