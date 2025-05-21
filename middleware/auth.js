const jwt = require('jsonwebtoken');
const User = require('../models/user');
const db = require('../config/db');

/**
 * Protect routes - Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header (Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check if token exists in cookie (for browser clients)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this resource',
          code: 'UNAUTHORIZED',
          status: 401
        }
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      const user = await User.findById(decoded.id || decoded.userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            status: 401
          }
        });
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
          status: 401,
          details: { error: error.message }
        }
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Server error during authentication',
        code: 'SERVER_ERROR',
        status: 500
      }
    });
  }
};

/**
 * Authorize by role - Restrict access to specific roles
 * @param {...string} roles - Roles allowed to access the route
 * @returns {Function} Middleware function
 */
const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      // Check if user exists (should be attached by protect middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not authenticated',
            code: 'UNAUTHENTICATED',
            status: 401
          }
        });
      }

      const userId = req.user.id;
      
      // Get user's role from the database
      const [userRoleRows] = await db.promise().query(
        'SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
        [userId]
      );

      if (userRoleRows.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'User role not found',
            code: 'ROLE_NOT_FOUND',
            status: 403
          }
        });
      }

      const userRole = userRoleRows[0].name;

      // Check if user's role is in the allowed roles
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Not authorized to access this resource',
            code: 'FORBIDDEN',
            status: 403
          }
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Server error during authorization',
          code: 'SERVER_ERROR',
          status: 500,
          details: { error: error.message }
        }
      });
    }
  };
};

module.exports = {
  protect,
  authorize
};
