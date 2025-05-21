const rateLimit = require('express-rate-limit');

/**
 * Rate limiter middleware factory
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per IP in the time window
 * @param {Object|string} options.message - Response message when rate limit is exceeded
 * @param {Object} options.standardHeaders - Whether to add standard headers (defaults to true)
 * @param {Object} options.legacyHeaders - Whether to add legacy headers (defaults to false)
 * @returns {Function} Express middleware function
 */
const rateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes by default
    max: 100, // 100 requests per windowMs by default
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  };

  // Merge provided options with defaults
  const limiterOptions = { ...defaultOptions, ...options };
  
  return rateLimit(limiterOptions);
};

module.exports = { rateLimiter };

