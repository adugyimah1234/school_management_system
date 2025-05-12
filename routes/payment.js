const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/', paymentController.recordPayment);
router.get('/:id', paymentController.getPaymentsByStudent);

module.exports = router;