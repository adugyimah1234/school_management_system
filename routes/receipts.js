const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { protect } = require('../middlewares/authMiddleware');

// Use existing controller functions
router.post('/', protect, receiptController.createReceipt);
router.get('/:id', protect, receiptController.getReceipt);  // Changed from getReceiptsByStudent to getReceipt
router.get('/', protect, receiptController.getAllReceipts);  // Add route to get all receipts
router.get('/:id/print', protect, receiptController.getPrintableReceipt);  // Add route for printable receipt

module.exports = router;
