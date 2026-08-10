// models/receiptItemModel.js
const db = require('../config/db');

exports.getCategoryStats = async (filter = {}) => {
  let query = `
    SELECT ri.receipt_type, SUM(ri.amount) AS total_amount, COUNT(*) AS count
    FROM receipt_items ri
    JOIN receipts r ON ri.receipt_id = r.id
  `;
  const queryParams = [];
  const whereConditions = [];

  if (filter.garrison_id) {
    whereConditions.push('r.garrison_id = ?');
    queryParams.push(filter.garrison_id);
  }
  if (filter.school_id) {
    whereConditions.push('r.school_id = ?');
    queryParams.push(filter.school_id);
  }

  if (whereConditions.length > 0) {
    query += ` WHERE ${whereConditions.join(' AND ')}`;
  }

  query += ` GROUP BY ri.receipt_type`;

  const [rows] = await db.promise().query(query, queryParams);
  return rows;
};
