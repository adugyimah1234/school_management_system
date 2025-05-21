const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const paymentController = require('../controllers/paymentController');
const receiptController = require('../controllers/receiptController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// Fee routes
router.get('/', protect, feeController.getAllFees);
router.get('/get', protect, feeController.getFee);
router.post('/', protect, isAdmin, feeController.createFee);
router.put('/:id', protect, isAdmin, feeController.updateFee);
router.delete('/:id', protect, isAdmin, feeController.deleteFee);
router.get('/outstanding/:studentId', protect, feeController.getOutstandingFees);

// Payment routes
router.get('/payments', protect, paymentController.getAllPayments);
router.get('/payments/:id', protect, paymentController.getPayment);
router.post('/payments', protect, paymentController.createPayment);
router.get('/payments/student/:studentId', protect, paymentController.getStudentPaymentHistory);

// Receipt routes
router.get('/receipts', protect, receiptController.getAllReceipts);
router.get('/receipts/:id', protect, receiptController.getReceipt);
router.post('/receipts', protect, receiptController.createReceipt);
router.get('/receipts/:id/print', protect, receiptController.getPrintableReceipt);

module.exports = router;
