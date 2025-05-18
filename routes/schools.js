const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const schoolController = require('../controllers/schoolController');

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

router.get('/', protect, schoolController.getAllSchools);
router.post('/', protect, isAdmin, schoolController.createSchool);
router.put('/:id', protect, isAdmin, schoolController.updateSchool);
router.delete('/:id', protect, isAdmin, schoolController.deleteSchool);

module.exports = router;