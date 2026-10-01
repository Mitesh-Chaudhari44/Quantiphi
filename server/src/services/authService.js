const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token helper
 */
const generateToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET || 'super_secret_jwt_key_event_finder_2026',
    { expiresIn: '7d' }
  );
};

/**
 * Service to register a new user
 */
const register = async ({ name, email, password, city, avatar }) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = new Error('User with this email already exists');
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    city: city || '',
    avatar: avatar || '',
  });

  // Generate token
  const token = generateToken(user._id, user.email);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Service to authenticate user login
 */
const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id, user.email);

  return {
    user: user.toJSON(),
    token,
  };
};

module.exports = {
  register,
  login,
  generateToken,
};
