const db = require('../config/db');

const Student = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM students');
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [id]);
    return rows;
  },

  async create(studentData) {
    const [result] = await db.query('INSERT INTO students SET ?', [studentData]);
    return result;
  },

  async delete(id) {
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [id]);
    return result;
  }
};

module.exports = Student;
