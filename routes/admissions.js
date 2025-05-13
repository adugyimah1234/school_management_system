const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, admissionController.createAdmission);
router.get('/:id', protect, admissionController.getAdmissionsByStudent);

module.exports = router;