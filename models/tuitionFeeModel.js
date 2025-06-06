// models/tuitionFeeModel.js
const db = require('../config/db.promise');

const TuitionFee = {
  async getFeeForClassAndCategory(class_id, category_id, academic_year) {
    const [rows] = await db.query(
      `SELECT * FROM tuition_fees
       WHERE category_id = ?
       AND academic_year = ?
       AND (class_id = ? OR class_id IS NULL)
       ORDER BY class_id DESC
       LIMIT 1`,
      [category_id, academic_year, class_id]
    );
    return rows[0];
  },

  async getAllFees() {
    const [rows] = await db.query(`
      SELECT tf.*, c.name AS class_name, cat.name AS category_name
      FROM tuition_fees tf
      LEFT JOIN classes c ON tf.class_id = c.id
      JOIN categories cat ON tf.category_id = cat.id
    `);
    return rows;
  },

  async createFee(class_id, category_id, amount, academic_year) {
    // Handle optional class_id using proper SQL
    let query = `SELECT id FROM tuition_fees WHERE category_id = ? AND academic_year = ?`;
    let params = [category_id, academic_year];

    if (class_id !== null && class_id !== undefined) {
      query += ` AND class_id = ?`;
      params.push(class_id);
    } else {
      query += ` AND class_id IS NULL`;
    }

    const [existing] = await db.query(query, params);
    if (existing.length > 0) {
      throw new Error('Fee already exists for this class and category in the given year');
    }

    const [result] = await db.query(
      `INSERT INTO tuition_fees (class_id, category_id, amount, academic_year)
       VALUES (?, ?, ?, ?)`,
      [class_id ?? null, category_id, amount, academic_year]
    );

    return { id: result.insertId, class_id, category_id, amount, academic_year };
  },

  async updateFeeForClassAndCategory(class_id, category_id, amount, academic_year) {
    const [result] = await db.query(
      `UPDATE tuition_fees SET amount = ?
       WHERE category_id = ?
       AND academic_year = ?
       AND ${class_id != null ? 'class_id = ?' : 'class_id IS NULL'}`,
      class_id != null
        ? [amount, category_id, academic_year, class_id]
        : [amount, category_id, academic_year]
    );

    if (result.affectedRows === 0) return null;

    return { class_id, category_id, amount, academic_year };
  }
};

module.exports = TuitionFee;
