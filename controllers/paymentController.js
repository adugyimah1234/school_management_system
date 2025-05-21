const db = require('../config/db'); // Database connection

/**
 * Get all payments with optional filters
 * @route GET /api/fees/payments
 * @access Private
 */
exports.getAllPayments = async (req, res) => {
  try {
    const { 
      student_id, 
      fee_id, 
      payment_date_from, 
      payment_date_to, 
      school_id 
    } = req.query;
    
    // Build the base query
    let query = `
      SELECT p.*, 
             s.first_name, s.middle_name, s.last_name,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN fees f ON p.fee_id = f.id
      LEFT JOIN users u ON p.recorded_by = u.id
      LEFT JOIN schools sch ON p.school_id = sch.id
    `;
    
    const queryParams = [];
    const whereConditions = [];
    
    // Add filters if provided
    if (student_id) {
      whereConditions.push('p.student_id = ?');
      queryParams.push(student_id);
    }
    
    if (fee_id) {
      whereConditions.push('p.fee_id = ?');
      queryParams.push(fee_id);
    }
    
    if (payment_date_from) {
      whereConditions.push('p.payment_date >= ?');
      queryParams.push(payment_date_from);
    }
    
    if (payment_date_to) {
      whereConditions.push('p.payment_date <= ?');
      queryParams.push(payment_date_to);
    }
    
    if (school_id) {
      whereConditions.push('p.school_id = ?');
      queryParams.push(school_id);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    query += ' ORDER BY p.payment_date DESC';
    
    // Execute query
    const [payments] = await db.promise().query(query, queryParams);
    res.json(payments);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get a specific payment by ID
 * @route GET /api/fees/payments/:id
 * @access Private
 */
exports.getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate required parameters
    if (!id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    
    // Query database for payment with details
    const [result] = await db.promise().query(
      `SELECT p.*, 
             s.first_name, s.middle_name, s.last_name,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name
       FROM payments p
       JOIN students s ON p.student_id = s.id
       JOIN fees f ON p.fee_id = f.id
       LEFT JOIN users u ON p.recorded_by = u.id
       LEFT JOIN schools sch ON p.school_id = sch.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(result[0]);
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a new payment record
 * @route POST /api/fees/payments
 * @access Private
 */
exports.createPayment = async (req, res) => {
  try {
    const { 
      student_id, 
      fee_id, 
      amount_paid, 
      payment_date,
      installment_number,
      school_id 
    } = req.body;
    
    // Validate required fields
    if (!student_id || !fee_id || !amount_paid) {
      return res.status(400).json({ 
        error: 'Please provide student_id, fee_id, and amount_paid' 
      });
    }
    
    // Check if student exists
    const [studentExists] = await db.promise().query(
      'SELECT id FROM students WHERE id = ?',
      [student_id]
    );
    
    if (studentExists.length === 0) {
      return res.status(400).json({ error: 'Student not found' });
    }
    
    // Check if fee exists
    const [feeExists] = await db.promise().query(
      'SELECT id, amount FROM fees WHERE id = ?',
      [fee_id]
    );
    
    if (feeExists.length === 0) {
      return res.status(400).json({ error: 'Fee not found' });
    }
    
    // Validate payment amount
    if (amount_paid <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }
    
    // Check if this would exceed the total fee amount
    const [totalPaid] = await db.promise().query(
      'SELECT SUM(amount_paid) as total FROM payments WHERE student_id = ? AND fee_id = ?',
      [student_id, fee_id]
    );
    
    const currentTotal = totalPaid[0].total || 0;
    const newTotal = currentTotal + parseFloat(amount_paid);
    
    if (newTotal > feeExists[0].amount) {
      return res.status(400).json({ 
        error: `Payment of ${amount_paid} would exceed the fee amount. Maximum allowed payment is ${(feeExists[0].amount - currentTotal).toFixed(2)}` 
      });
    }
    
    // Set default values
    const today = new Date().toISOString().split('T')[0];
    const paymentDate = payment_date || today;
    const installmentNum = installment_number || 1;
    
    // Current user (from auth middleware)
    const recorded_by = req.user ? req.user.id : null;
    
    // Insert payment record
    const [result] = await db.promise().query(
      `INSERT INTO payments 
       (student_id, fee_id, amount_paid, payment_date, installment_number, recorded_by, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id, 
        fee_id, 
        amount_paid, 
        paymentDate,
        installmentNum,
        recorded_by,
        school_id || null
      ]
    );
    
    // Get the created payment with details
    const [payment] = await db.promise().query(
      `SELECT p.*, 
             s.first_name, s.middle_name, s.last_name,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             f.fee_type, f.amount as fee_amount, f.description as fee_description
       FROM payments p
       JOIN students s ON p.student_id = s.id
       JOIN fees f ON p.fee_id = f.id
       WHERE p.id = ?`,
      [result.insertId]
    );
    
    // Check if fee is fully paid and generate receipt if needed
    if (newTotal >= feeExists[0].amount) {
      // Generate a receipt automatically for fully paid fees
      await db.promise().query(
        `INSERT INTO receipts
         (student_id, payment_id, receipt_type, amount, issued_by, date_issued, class_id, school_id)
         VALUES (?, ?, (SELECT fee_type FROM fees WHERE id = ?), ?, ?, ?, 
                (SELECT class_id FROM students WHERE id = ?), ?)`,
        [
          student_id,
          result.insertId,
          fee_id,
          feeExists[0].amount,
          recorded_by,
          today,
          student_id,
          school_id || null
        ]
      );
    }
    
    res.status(201).json({ 
      message: 'Payment recorded successfully', 
      data: payment[0],
      is_paid_in_full: newTotal >= feeExists[0].amount
    });
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get payment history for a student
 * @route GET /api/fees/payments/student/:studentId
 * @access Private
 */
exports.getStudentPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Validate student id
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    // Check if student exists
    const [student] = await db.promise().query(
      'SELECT id FROM students WHERE id = ?',
      [studentId]
    );
    
    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get all payments for this student
    const [payments] = await db.promise().query(
      `SELECT p.*, 
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name,
             (SELECT COUNT(*) > 0 FROM receipts r WHERE r.payment_id = p.id) as has_receipt
       FROM payments p
       JOIN fees f ON p.fee_id = f.id
       LEFT JOIN users u ON p.recorded_by = u.id
       LEFT JOIN schools sch ON p.school_id = sch.id
       WHERE p.student_id = ?
       ORDER BY p.payment_date DESC`,
      [studentId]
    );
    
    // Get fee payment summary
    const [feeSummary] = await db.promise().query(
      `SELECT f.id as fee_id, f.fee_type, f.amount as total_amount, f.description,
              COALESCE(SUM(p.amount_paid), 0) as amount_paid,
              f.amount - COALESCE(SUM(p.amount_paid), 0) as remaining_amount,
              (f.amount - COALESCE(SUM(p.amount_paid), 0) <= 0) as is_paid
       FROM fees f
       LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
       WHERE f.class_id = (SELECT class_id FROM students WHERE id = ?)
       AND f.category_id = (SELECT category_id FROM students WHERE id = ?)
       GROUP BY f.id
       ORDER BY f.fee_type`,
      [studentId, studentId, studentId]
    );
    
    res.json({
      student_id: parseInt(studentId),
      payments: payments,
      fee_summary: feeSummary,
      total_paid: payments.reduce((sum, payment) => sum + payment.amount_paid, 0),
      payment_count: payments.length
    });
  } catch (err) {
    console.error('Error fetching student payment history:', err);
    res.status(500).json({ error: err.message });
  }
};

const Payment = require('../models/paymentModel');
const db = require('../config/db'); // your mysql db connection

exports.recordPayment = (req, res) => {
  Payment.recordPayment(req.body, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error recording payment', error: err });
    res.status(201).json({ message: 'Payment recorded', data: result });
  });
};

exports.getPaymentsByStudent = (req, res) => {
  const studentId = req.params.id;
  Payment.getPaymentsByStudent(studentId, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error fetching payments', error: err });
    res.json(result);
  });
};