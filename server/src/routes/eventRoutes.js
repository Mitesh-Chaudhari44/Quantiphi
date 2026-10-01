const express = require('express');
const { query, param } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const { optionalAuth } = require('../middleware/optionalAuthMiddleware');
const { getEvents, getCalendarEvents, getEventById } = require('../controllers/eventController');

const router = express.Router();

// Validation for GET /api/events query parameters
const getEventsValidation = [
  query('keyword').optional().trim().isString().withMessage('Keyword must be a string'),
  query('city').optional().trim().isString().withMessage('City must be a string'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  query('category').optional().trim().isString().withMessage('Category must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('size').optional().isInt({ min: 1, max: 100 }).withMessage('Size must be between 1 and 100'),
];

// Validation for GET /api/events/calendar query parameters
const calendarValidation = [
  query('month')
    .notEmpty()
    .withMessage('Month query parameter is required')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Month must be in YYYY-MM format (e.g. 2026-10)'),
  query('city').optional().trim().isString(),
  query('category').optional().trim().isString(),
];

// Validation for GET /api/events/:eventId
const eventIdValidation = [
  param('eventId').trim().notEmpty().withMessage('eventId parameter is required'),
];

// Routes
router.get('/', optionalAuth, getEventsValidation, validate, getEvents);
router.get('/calendar', optionalAuth, calendarValidation, validate, getCalendarEvents);
router.get('/:eventId', optionalAuth, eventIdValidation, validate, getEventById);

module.exports = router;
