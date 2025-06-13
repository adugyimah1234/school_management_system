const db = require('../config/db');

const Parent = {
  /**
   * Create a parent record
   * @param {Object} data - Parent info
   * @returns {Promise<Object>} - Insert result
   */
  async create(data) {
    const [result] = await db.query('INSERT INTO parents SET ?', [data]);
    return result;
  },

  /**
   * Get parent info by student ID
   * @param {number} studentId
   * @returns {Promise<Object[]>}
   */
  async getByStudentId(studentId) {
    const [rows] = await db.query('SELECT * FROM parents WHERE student_id = ?', [studentId]);
    return rows;
  }
};

module.exports = Parent;
