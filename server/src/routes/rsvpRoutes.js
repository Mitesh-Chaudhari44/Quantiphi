const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const {
  createRsvp,
  updateRsvp,
  updateRsvpReminderSettings,
  deleteRsvp,
  getRsvps,
} = require('../controllers/rsvpController');

const router = express.Router();

const createRsvpValidation = [
  body('eventId').trim().notEmpty().withMessage('eventId is required'),
  body('status')
    .optional()
    .isIn(['interested', 'confirmed'])
    .withMessage('Status must be either "interested" or "confirmed"'),
];

const updateRsvpValidation = [
  param('eventId').trim().notEmpty().withMessage('eventId parameter is required'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['interested', 'confirmed'])
    .withMessage('Status must be either "interested" or "confirmed"'),
];

const updateReminderValidation = [
  param('eventId').trim().notEmpty().withMessage('eventId parameter is required'),
  body('enabled').optional().isBoolean().withMessage('enabled must be a boolean'),
  body('remindBeforeMinutes')
    .optional()
    .isIn([15, 30, 60, 120, 1440])
    .withMessage('remindBeforeMinutes must be one of: 15, 30, 60, 120, 1440'),
];

const deleteRsvpValidation = [
  param('eventId').trim().notEmpty().withMessage('eventId parameter is required'),
];

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

router.use(protect);

router.post('/', createRsvpValidation, validate, createRsvp);
router.patch('/:eventId/reminder', updateReminderValidation, validate, updateRsvpReminderSettings);
router.patch('/:eventId', updateRsvpValidation, validate, updateRsvp);
router.delete('/:eventId', deleteRsvpValidation, validate, deleteRsvp);
router.get('/', getRsvpsValidation, validate, getRsvps);

module.exports = router;
