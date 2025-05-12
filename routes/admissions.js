const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');

router.post('/', admissionController.createAdmission);
router.get('/:id', admissionController.getAdmissionsByStudent);

module.exports = router;