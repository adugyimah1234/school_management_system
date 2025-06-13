const express = require('express');
const router = express.Router();
const db = require('../config/db');
const feeController = require('../controllers/feeController');
const paymentController = require('../controllers/paymentController');
const receiptController = require('../controllers/receiptController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

console.log('feeController:', feeController);
console.log('paymentController:', paymentController);
console.log('receiptController:', receiptController);
// Fee routes
router.get('/', protect, (req, res) => {
  db.query('SELECT * FROM fees', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/', protect, async (req, res) => {
  const { amount, category_id, description, academic_year_id } = req.body;

  // Validate required fields
  if (!amount || !category_id || !academic_year_id) {
    return res.status(400).json({
      error: "Please provide all required fields: amount, category_id, academic_year_id"
    });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO fees (amount, category_id, description, academic_year_id) VALUES (?, ?, ?, ?)',
      [amount, category_id, description, academic_year_id]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Fee created successfully'
    });
  } catch (err) {
    console.error('Error creating fee:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/get', protect, feeController.getFee);

router.put('/:id', 
  protect, // Authentication middleware
  isAdmin, // Authorization middleware
  (req, res) => {
    const { id } = req.params;
    const { amount, category_id, description, academic_year_id } = req.body;

    if (!amount || !category_id || !academic_year_id) {
      return res.status(400).json({
        error: "Please provide all required fields: amount, category_id, academic_year_id"
      });
    }

    db.promise().query(
      'UPDATE fees SET amount = ?, category_id = ?, description = ?, academic_year_id = ? WHERE id = ?',
      [amount, category_id, description, academic_year_id, id]
    )
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Fee not found' });
      }
      res.json({ message: 'Fee updated successfully' });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
  }
);
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
