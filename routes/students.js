const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, studentController.getAllStudents);
router.get('/:id', protect, studentController.getStudent);
router.post('/', protect, studentController.createStudent);
router.delete('/:id', protect, studentController.deleteStudent);

module.exports = router;
