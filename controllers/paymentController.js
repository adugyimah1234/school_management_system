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