// controllers/receiptItemController.js
const receiptItemModel = require('../models/receiptItemModel');

exports.getCategoryStats = async (req, res) => {
  try {
    const user = req.user;
    const filter = {};

    if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
      if (user.garrison_id) filter.garrison_id = user.garrison_id;
      if (user.school_id) filter.school_id = user.school_id;
    }

    const stats = await receiptItemModel.getCategoryStats(filter);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching category stats:", error);
    res.status(500).json({ message: 'Server error' });
  }
};
