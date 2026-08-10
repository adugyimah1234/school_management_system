const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../controllers/authController');
const userService = require('../services/userService');
const response = require('../utils/apiResponse');
require('dotenv').config();

// Protect route: ensure token is valid and not blacklisted
exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.error(res, 'Not authorized. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Check Redis Blacklist
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return response.error(res, 'Token has been invalidated. Please log in again.', 401);
    }

    // 2. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Fetch Full User (with Caching)
    const user = await userService.getUserById(decoded.id);

    if (!user) {
      return response.error(res, 'User no longer exists.', 401);
    }

    // 4. Attach to request
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err.message);
    return response.error(res, 'Invalid or expired token', 401);
  }
};

// Restrict route to admins only
exports.isAdmin = (req, res, next) => {
  const normalizedRole = (req.user?.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
  const allowedRoles = ['admin', 'superadmin', 'schooladmin'];
  if (!req.user || !allowedRoles.includes(normalizedRole)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrative authorization required.'
    });
  }
  next();
};

// Restrict route to superadmin only
exports.isSuperAdmin = (req, res, next) => {
  const normalizedRole = (req.user?.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
  if (!req.user || normalizedRole !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Administrators only.'
    });
  }
  next();
};

// Restrict route to garrison_director only
exports.isGarrisonDirector = (req, res, next) => {
  const normalizedRole = (req.user?.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
  if (!req.user || normalizedRole !== 'garrisondirector') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Garrison Directors only.'
    });
  }
  next();
};

// Restrict route to either super_admin or garrison_director
exports.isSuperAdminOrDirector = (req, res, next) => {
  const normalizedRole = (req.user?.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
  const allowedRoles = ['superadmin', 'garrisondirector'];
  if (!req.user || !allowedRoles.includes(normalizedRole)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. High-level administrative authorization required.'
    });
  }
  next();
};

// Optional: Restrict route to any custom role
exports.isRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${requiredRole} role required.`
      });
    }
    next();
  };
};

