const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, receiptController.createReceipt);
router.get('/:id', protect, receiptController.getReceiptsByStudent);

module.exports = router;