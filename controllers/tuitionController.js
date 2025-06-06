const TuitionFee = require('../models/tuitionFeeModel');
const TuitionPayment = require('../models/tuitionPaymentModel');
const db = require('../config/db.promise');

exports.payTuition = async (req, res) => {
  try {
    const { student_id, amount } = req.body;

    // Get student class and category
    const [studentRows] = await db.query(
      `SELECT s.id, s.class_id, s.category_id
       FROM students s
       WHERE s.id = ?`, 
      [student_id]
    );
    const student = studentRows[0];
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Get tuition fee for student's class and category
const academic_year = '2024/2025'; // Replace with actual value or derive from context
const fee = await TuitionFee.getFeeForClassAndCategory(student.class_id, student.category_id, academic_year);

    if (!fee) return res.status(400).json({ message: 'No tuition fee set for this class/category' });

    // Get total paid
    const totalPaid = await TuitionPayment.getTotalPaid(student_id, fee.id);
    const balance = parseFloat(fee.amount) - parseFloat(totalPaid);

    if (amount > balance) {
      return res.status(400).json({ message: `Payment exceeds remaining balance (GHC ${balance.toFixed(2)})` });
    }

    // Record payment
    const paymentId = await TuitionPayment.recordPayment(student_id, fee.id, amount);
    res.json({ message: 'Payment recorded', paymentId, remaining_balance: balance - amount });

  } catch (err) {
    console.error('Error processing tuition payment:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getPaymentHistory = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Get payment history
    const history = await TuitionPayment.getPaymentHistory(student_id);
    res.json(history);

  } catch (err) {
    console.error('Error fetching payment history:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getTuitionFee = async (req, res) => {
  try {
    const { class_id, category_id } = req.params;

    // Get tuition fee for class and category
    const fee = await TuitionFee.getFeeForClassAndCategory(class_id, category_id);
    if (!fee) return res.status(404).json({ message: 'No tuition fee set for this class/category' });

    res.json(fee);

  } catch (err) {
    console.error('Error fetching tuition fee:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.updateTuitionFee = async (req, res) => {
  try {
    const { class_id, category_id } = req.params;
    const { amount } = req.body;

    // Update tuition fee for class and category
    const updatedFee = await TuitionFee.updateFeeForClassAndCategory(class_id, category_id, amount);
    if (!updatedFee) return res.status(404).json({ message: 'No tuition fee found for this class/category' });

    res.json({ message: 'Tuition fee updated successfully', fee: updatedFee });

  } catch (err) {
    console.error('Error updating tuition fee:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getTuitionFees = async (req, res) => {
  try {
    const fees = await TuitionFee.getAllFees();
    res.json(fees);
  } catch (err) {
    console.error('Error fetching tuition fees:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.createTuitionFee = async (req, res) => {
  try {
    const { class_id, category_id, amount } = req.body;

    // Create new tuition fee
    const newFee = await TuitionFee.createFee(class_id, category_id, amount);
    res.status(201).json({ message: 'Tuition fee created successfully', fee: newFee });

  } catch (err) {
    console.error('Error creating tuition fee:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/tuition-balance/:student_id
exports.getStudentBalance = async (req, res) => {
  try {
    const { student_id } = req.params;

    const [studentRows] = await db.query(
      `SELECT class_id, category_id FROM students WHERE id = ?`,
      [student_id]
    );
    const student = studentRows[0];
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const fee = await TuitionFee.getFeeForClassAndCategory(student.class_id, student.category_id);
    if (!fee) return res.status(400).json({ message: 'No tuition fee set for this class/category' });

    const totalPaid = await TuitionPayment.getTotalPaid(student_id, fee.id);
    const balance = parseFloat(fee.amount) - parseFloat(totalPaid);

    res.json({
      student_id,
      class_id: student.class_id,
      category_id: student.category_id,
      total_fee: parseFloat(fee.amount),
      total_paid: parseFloat(totalPaid),
      balance: parseFloat(balance)
    });
  } catch (err) {
    console.error('Error fetching tuition balance:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
