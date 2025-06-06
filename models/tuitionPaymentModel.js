// models/tuitionPaymentModel.js
const db = require('../config/db.promise');

const TuitionPayment = {
  async getTotalPaid(student_id, fee_id) {
    const [rows] = await db.query(
      `SELECT SUM(amount) AS total_paid
       FROM tuition_payments
       WHERE student_id = ? AND fee_id = ?`,
      [student_id, fee_id]
    );
    return rows[0].total_paid || 0;
  },

  async recordPayment(student_id, fee_id, amount) {
    const [result] = await db.query(
      `INSERT INTO tuition_payments (student_id, fee_id, amount)
       VALUES (?, ?, ?)`,
      [student_id, fee_id, amount]
    );
    return result.insertId;
  },

  async getPaymentHistory(student_id) {
    const [rows] = await db.query(
      `SELECT tp.*, tf.amount AS total_fee, c.name AS class_name, cat.name AS category_name
       FROM tuition_payments tp
       JOIN tuition_fees tf ON tp.fee_id = tf.id
       JOIN classes c ON tf.class_id = c.id
       JOIN categories cat ON tf.category_id = cat.id
       WHERE tp.student_id = ?
       ORDER BY tp.created_at DESC`,
      [student_id]
    );
    return rows;
  }
};

module.exports = TuitionPayment;
