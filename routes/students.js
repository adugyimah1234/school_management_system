const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.get('/', studentController.getAllStudents);
router.get('/:id', studentController.getStudent);
router.post('/', studentController.createStudent);
router.delete('/:id', studentController.deleteStudent);
router.post('/:id/promote', studentController.promoteStudent);
router.post('/:id/transfer', studentController.transferStudent);
router.put('/:id', studentController.updateStudent);



module.exports = router;