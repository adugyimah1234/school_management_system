const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, studentController.getAllStudents);
router.get('/:id', protect, studentController.getStudent);
router.post('/', protect, studentController.createStudent);
router.delete('/:id', protect, studentController.deleteStudent);
router.post('/:id/promote', protect, studentController.promoteStudent);
router.post('/:id/transfer', protect, studentController.transferStudent);
router.put('/:id', protect, studentController.updateStudent);



module.exports = router;