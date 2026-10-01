const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/apiResponse');

/**
 * Authentication Middleware to verify JWT token
 */
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 401, 'Not authorized, token missing');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_event_finder_2026');
    req.user = decoded; // Contains id, email, etc.
    next();
  } catch (error) {
    return sendError(res, 401, 'Not authorized, token invalid or expired');
  }
};

module.exports = { protect };
