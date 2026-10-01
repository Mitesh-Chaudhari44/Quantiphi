const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { createRsvp, updateRsvp, deleteRsvp, getRsvps } = require('../controllers/rsvpController');

const router = express.Router();

// Validation for POST /api/rsvps
const createRsvpValidation = [
  body('eventId').trim().notEmpty().withMessage('eventId is required'),
  body('status')
    .optional()
    .isIn(['interested', 'confirmed'])
    .withMessage('Status must be either "interested" or "confirmed"'),
];

// Validation for PATCH /api/rsvps/:eventId
const updateRsvpValidation = [
  param('eventId').trim().notEmpty().withMessage('eventId parameter is required'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['interested', 'confirmed'])
    .withMessage('Status must be either "interested" or "confirmed"'),
];

// Validation for DELETE /api/rsvps/:eventId
const deleteRsvpValidation = [
  param('eventId').trim().notEmpty().withMessage('eventId parameter is required'),
];

// Validation for GET /api/rsvps
const getRsvpsValidation = [
  query('status')
    .optional()
    .isIn(['interested', 'confirmed'])
    .withMessage('Status filter must be "interested" or "confirmed"'),
  query('when')
    .optional()
    .isIn(['upcoming', 'past'])
    .withMessage('When filter must be "upcoming" or "past"'),
];

// All RSVP routes require JWT protection
router.use(protect);

router.post('/', createRsvpValidation, validate, createRsvp);
router.patch('/:eventId', updateRsvpValidation, validate, updateRsvp);
router.delete('/:eventId', deleteRsvpValidation, validate, deleteRsvp);
router.get('/', getRsvpsValidation, validate, getRsvps);

module.exports = router;
