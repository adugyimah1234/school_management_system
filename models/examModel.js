const db = require('../config/db');

const Exam = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM exams');
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM exams WHERE id = ?', [id]);
    return rows;
  },

  async create(examData) {
    const [result] = await db.query('INSERT INTO exams SET ?', [examData]);
    return result;
  },

  async update(id, examData) {
    await db.query('UPDATE exams SET ? WHERE id = ?', [examData, id]);
  },

  async delete(id) {
    await db.query('DELETE FROM exams WHERE id = ?', [id]);
  }
};

module.exports = Exam;
