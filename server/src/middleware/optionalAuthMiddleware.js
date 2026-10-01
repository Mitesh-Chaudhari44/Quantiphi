const jwt = require('jsonwebtoken');

/**
 * Optional Authentication Middleware
 * If a valid JWT token is present in Authorization header, attaches req.user.
 * Does NOT block the request if token is missing or invalid.
 */
const optionalAuth = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_event_finder_2026');
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = { optionalAuth };
