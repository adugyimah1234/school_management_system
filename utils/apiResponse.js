/**
 * Standard API Response Utility
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {any} data - Data to send
 * @param {string} message - Optional success message
 * @param {number} code - HTTP status code (default 200)
 */
const success = (res, data, message = 'Success', code = 200) => {
  return res.status(code).json({
    success: true,
    message,
    data
  });
};

/**
 * Send an error response (used for controlled errors)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} code - HTTP status code (default 500)
 * @param {any} errors - Optional validation errors
 */
const error = (res, message = 'Internal Server Error', code = 500, errors = null) => {
  return res.status(code).json({
    success: false,
    message,
    errors
  });
};

module.exports = {
  success,
  error
};
