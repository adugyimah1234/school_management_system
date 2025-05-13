const Fee = require('../models/feeModel');
const db = require('../config/db'); // your mysql db connection

exports.getFee = (req, res) => {
  const { category, classLevel } = req.query;
  Fee.getFee(category, classLevel, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error fetching fee', error: err });
    res.json(result);
  });
};

exports.getAllFees = (req, res) => {
  Fee.getAll((err, result) => {
    if (err) return res.status(500).json({ message: 'Error fetching fees', error: err });
    res.json(result);
  });
};

exports.createFee = (req, res) => {
  Fee.create(req.body, (err, result) => {
    if (err) return res.status(500).json({ message: 'Error creating fee', error: err });
    res.status(201).json({ message: 'Fee structure added', data: result });
  });
};
