const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, feeController.getAllFees);
router.get('/get', protect, feeController.getFee);
router.post('/', protect, feeController.createFee);

module.exports = router;