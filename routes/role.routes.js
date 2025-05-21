const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { protect } = require('../middlewares/authMiddleware');

// Middleware to check if the user is an admin (adjust as needed)
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

router.get('/', protect, roleController.getAllRoles);
router.get('/:id', protect, roleController.getRoleById);
router.post('/', protect, isAdmin, roleController.createRole);
router.put('/:id', protect, isAdmin, roleController.updateRole);
router.delete('/:id', protect, isAdmin, roleController.deleteRole);

module.exports = router;
