const { sendError } = require('../utils/apiResponse');

/**
 * Centralized Error Handling Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('[Error Middleware]:', err.stack || err.message);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';
  const data = err.errors || null;

  return sendError(res, statusCode, message, data);
};

module.exports = errorMiddleware;
