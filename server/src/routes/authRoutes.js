const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validateMiddleware');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

// Validation rules for Register
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('city').optional().trim(),
];

// Validation rules for Login
const loginValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, validate, registerUser);
router.post('/login', loginValidation, validate, loginUser);

module.exports = router;
