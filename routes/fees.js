const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');

router.get('/', feeController.getAllFees);
router.get('/get', feeController.getFee);
router.post('/', feeController.createFee);

module.exports = router;