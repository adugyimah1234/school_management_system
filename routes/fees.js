const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const paymentController = require('../controllers/paymentController');
const receiptController = require('../controllers/receiptController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply general API rate limiting
router.use(apiLimiter);

// --- Fee Routes ---

// List all fees
router.get('/', protect, feeController.getAllFees);

// Legacy endpoint support
router.get('/get', protect, feeController.getFee);

// Create new fee structure
router.post('/', protect, isAdmin, feeController.createFee);

// Update fee structure
router.put('/:id', protect, isAdmin, feeController.updateFee);

// Delete fee structure
router.delete('/:id', protect, isAdmin, feeController.deleteFee);

// Get outstanding fees for a specific student
router.get('/outstanding/:studentId', protect, feeController.getOutstandingFees);

// Get general debt ledger
router.get('/ledger', protect, isAdmin, feeController.getDebtLedger);

// Send debt reminders
router.post('/reminders', protect, isAdmin, feeController.sendDebtReminders);


// --- Payment Routes ---

// List all payments
router.get('/payments', protect, paymentController.getAllPayments);

// Get specific payment details
router.get('/payments/:id', protect, paymentController.getPayment);

// Record a new payment
router.post('/payments', protect, paymentController.createPayment);

// Get all payments for a specific student
router.get('/payments/student/:studentId', protect, paymentController.getStudentPaymentHistory);


// --- Receipt Routes ---

// List all receipts
router.get('/receipts', protect, receiptController.getAllReceipts);

// Get specific receipt details
router.get('/receipts/:id', protect, receiptController.getReceipt);

// Manually generate a receipt
router.post('/receipts', protect, isAdmin, receiptController.createReceipt);

// Get printable HTML for a receipt
router.get('/receipts/:id/print', protect, receiptController.getPrintableReceipt);

module.exports = router;
