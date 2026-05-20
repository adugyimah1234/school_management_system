// Enhanced auth.js routes
const express = require('express');
const router = express.Router();
const { protect, loadAccessContext, resolveBranch } = require('../middlewares/authMiddleware');
const authController = require('../controllers/authController');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes
router.post('/logout', protect, authController.logout);
router.post('/change-password', protect, authController.changePassword);
router.get('/validate', authController.validateToken); // Can be called without protect middleware
router.get('/me', protect, loadAccessContext, resolveBranch(), (req, res) => {
  // Get current user info
  res.json({
    success: true,
    user: req.user,
    scope: req.scope
  });
});

module.exports = router;