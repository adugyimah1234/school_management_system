const db = require('../config/db');

const Receipt = {
  /**
   * Create a new receipt
   * @param {Object} data - Receipt payload
   * @returns {Promise<Object>} - Insert result
   */
  async create(data) {
    const [result] = await db.query('INSERT INTO receipts SET ?', [data]);
    return result;
  },

  /**
   * Get all receipts by student ID
   * @param {number} studentId
   * @returns {Promise<Object[]>}
   */
  async getByStudentId(studentId) {
    const [rows] = await db.query('SELECT * FROM receipts WHERE student_id = ?', [studentId]);
    return rows;
  },

  /**
   * Get all receipts by registration ID
   * @param {number} registrationId
   * @returns {Promise<Object[]>}
   */
  async getByRegistrationId(registrationId) {
    const [rows] = await db.query('SELECT * FROM receipts WHERE registration_id = ?', [registrationId]);
    return rows;
  },

  /**
   * Get a single receipt by its ID
   * @param {number} receiptId
   * @returns {Promise<Object|null>}
   */
  async getById(receiptId) {
    const [rows] = await db.query('SELECT * FROM receipts WHERE id = ?', [receiptId]);
    return rows[0] || null;
  }
};

module.exports = Receipt;
