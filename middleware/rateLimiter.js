const { rateLimit } = require('express-rate-limit');

/**
 * Professional Smart Rate Limiter
 * Implements "Big Tech" principles:
 * 1. Trusts Cloudflare/Proxy headers
 * 2. Supports IP Whitelisting (Office IPs)
 * 3. Role-based dynamic limits (Admins/Staff get higher quotas)
 */

const getClientIp = (req) => {
  // Priority 1: Cloudflare Connecting IP
  // Priority 2: X-Forwarded-For (Standard Proxy)
  // Priority 3: Remote Address
  return req.headers['cf-connecting-ip'] ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.socket.remoteAddress;
};

const isWhitelisted = (ip) => {
  const whitelist = process.env.WHITELISTED_IPS ? process.env.WHITELISTED_IPS.split(',') : [];
  return whitelist.includes(ip);
};

/**
 * Creates a rate limiter that adapts to the user's role and IP
 */
const smartLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default 15 minutes
    max: (req) => {
      const ip = getClientIp(req);

      // 1. Whitelist (Office IPs) - No limit
      if (isWhitelisted(ip)) return 0; // 0 in express-rate-limit 7+ means unlimited if used with skip

      // 2. Role-based limits
      if (req.user) {
        if (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'garrison_director') {
          return options.adminMax || 2000; // High limit for staff
        }
      }

      // 3. Public/Default limit
      return options.max || 100;
    },
    skip: (req) => {
      const ip = getClientIp(req);
      return isWhitelisted(ip);
    },
    keyGenerator: (req) => {
      return getClientIp(req);
    },
    message: {
      success: false,
      message: 'Too many requests. If you are a staff member, please ensure you are logged in or contact IT to whitelist your office IP.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};

// Specialized limiters for different parts of the app
const authLimiter = smartLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 login attempts per 15 mins for public
  adminMax: 50,
  message: 'Multiple failed login attempts detected. Please try again in 15 minutes.'
});

const apiLimiter = smartLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // 60 req/min for public
  adminMax: 300, // 300 req/min for staff (5 per second)
});

module.exports = {
  smartLimiter,
  authLimiter,
  apiLimiter,
  rateLimiter: smartLimiter // Alias for backward compatibility
};
