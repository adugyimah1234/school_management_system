// Enhanced auth.js routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const authController = require('../controllers/authController');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/validate', authController.validateToken); // Can be called without protect middleware
router.get('/me', protect, (req, res) => {
  // Get current user info
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;