// routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware');
const categoryController = require('../controllers/categoryController');

// Helper function to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

/**
 * Routes definitions using controllers
 */
router.get('/', protect, categoryController.getAllCategories);
router.get('/:id', protect, categoryController.getCategoryById);
router.post('/', protect, isAdmin, categoryController.createCategory);
router.put('/:id', protect, isAdmin, categoryController.updateCategory);
router.delete('/:id', protect, isAdmin, categoryController.deleteCategory);

module.exports = router;
