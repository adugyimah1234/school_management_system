const express = require('express');
const { processPayment } = require('../controllers/payment');

const router = express.Router();

// POST /api/payments/process
router.post('/process', processPayment);

module.exports = router;