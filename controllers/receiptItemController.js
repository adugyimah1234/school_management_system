// controllers/receiptItemController.js
const receiptItemModel = require('../models/receiptItemModel');

exports.getCategoryStats = async (req, res) => {
  try {
    const stats = await receiptItemModel.getCategoryStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching category stats:", error);
    res.status(500).json({ message: 'Server error' });
  }
};
