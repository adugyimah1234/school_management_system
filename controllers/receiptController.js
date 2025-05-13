const Receipt = require('../models/receiptModel');
const db = require('../config/db'); // your mysql db connection

exports.createReceipt = (req, res) => {
  Receipt.create(req.body, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error creating receipt', error: err });
    res.status(201).json({ message: 'Receipt created successfully', data: result });
  });
};

exports.getReceiptsByStudent = (req, res) => {
  const studentId = req.params.id;
  Receipt.getByStudentId(studentId, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error fetching receipts', error: err });
    res.json(result);
  });
};