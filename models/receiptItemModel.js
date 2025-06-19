// models/receiptItemModel.js
const db = require('../config/db');

exports.getCategoryStats = async () => {
  const [rows] = await db.promise().query(`
    SELECT receipt_type, SUM(amount) AS total_amount, COUNT(*) AS count
    FROM receipt_items
    GROUP BY receipt_type
  `);
  return rows;
};
