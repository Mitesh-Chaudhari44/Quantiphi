const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { getCurrentUser, updateCurrentUser } = require('../controllers/userController');

const router = express.Router();

// Validation rules for updating profile
const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('city').optional().trim(),
  body('reminderSettings.enabled')
    .optional()
    .isBoolean()
    .withMessage('reminderSettings.enabled must be a boolean'),
  body('reminderSettings.remindBeforeMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('reminderSettings.remindBeforeMinutes must be a positive integer'),
];

router.get('/me', protect, getCurrentUser);
router.put('/me', protect, updateProfileValidation, validate, updateCurrentUser);

module.exports = router;
