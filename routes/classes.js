
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const classController = require('../controllers/classController');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// Get all classes (accessible by all authenticated users)
router.get('/', protect, classController.getAllClasses);

// Get single class by ID
router.get('/:id', protect, classController.getClassById);

// Create new class (admin only)
router.post('/', protect, isAdmin, classController.createClass);

// Update class (admin only)
router.put('/:id', protect, isAdmin, classController.updateClass);

// Delete class (admin only)
router.delete('/:id', protect, isAdmin, classController.deleteClass);

module.exports = router;