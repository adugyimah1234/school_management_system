const db = require('../config/db');

const Admission = {
  /**
   * Create a new admission record
   * @param {Object} data - Admission data
   * @returns {Promise<Object>} - Insert result
   */
  async create(data) {
    const [result] = await db.query('INSERT INTO admissions SET ?', [data]);
    return result;
  },

  /**
   * Get admission record by student ID
   * @param {number} studentId
   * @returns {Promise<Object[]>}
   */
  async getByStudentId(studentId) {
    const [rows] = await db.query('SELECT * FROM admissions WHERE student_id = ?', [studentId]);
    return rows;
  }
};

module.exports = Admission;
