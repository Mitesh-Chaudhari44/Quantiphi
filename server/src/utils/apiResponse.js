/**
 * Standardized API response structure: { success, data, message }
 */

const sendSuccess = (res, statusCode = 200, data = null, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

const sendError = (res, statusCode = 500, message = 'Internal Server Error', data = null) => {
  return res.status(statusCode).json({
    success: false,
    data,
    message,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
