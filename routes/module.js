const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const {
  getUserModuleAccess,
  updateModuleAccess,
  getAllModules,
  getModulesByRole
} = require('../controllers/module_accessController');

const router = express.Router();

// Apply rate limiting to all module routes
const modulesRateLimit = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { success: false, error: { message: 'Too many requests, please try again later.' } }
});

// Define module routes that match frontend implementation
// GET /api/admin/modules - Get all modules
// GET /api/admin/modules?role=roleId - Get modules for a specific role
router.get('/', protect, authorize('admin'), modulesRateLimit, (req, res, next) => {
  if (req.query.role) {
    // If role query parameter exists, get modules for that role
    return getModulesByRole(req, res, next);
  }
  // Otherwise get all modules
  return getAllModules(req, res, next);
});

// GET /api/admin/modules/access?userId=userId - Get user's module access
router.get('/access', protect, authorize('admin'), modulesRateLimit, getUserModuleAccess);

// POST /api/admin/modules/access - Update module access for a user
router.post('/access', protect, authorize('admin'), modulesRateLimit, updateModuleAccess);

module.exports = router;
