const db = require('../config/db');
const crypto = require('crypto');

const Student = {
  async getAll(filter = {}) {
    let sql = 'SELECT * FROM students';
    const params = [];

    if (Object.keys(filter).length > 0) {
      const conditions = Object.keys(filter).map(key => {
        params.push(filter[key]);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [rows] = await db.query(sql, params);
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM students WHERE id = ?', [id]);
    return rows;
  },

  async create(studentData) {
    const id = studentData.id || crypto.randomUUID();
    const record = { id, ...studentData };
    const [result] = await db.query('INSERT INTO students SET ?', [record]);
    return { id, ...result };
  },

  async update(id, studentData) {
    const [result] = await db.query('UPDATE students SET ? WHERE id = ?', [studentData, id]);
    return result;
  },

  async delete(id) {
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [id]);
    return result;
  },

  async promote(id, newClassId) {
    const [result] = await db.query(
      'UPDATE students SET class_id = ? WHERE id = ?',
      [newClassId, id]
    );
    return result;
  },

  async transfer(id, newSchoolId, newClassId) {
    const [result] = await db.query(
      'UPDATE students SET school_id = ?, class_id = ? WHERE id = ?',
      [newSchoolId, newClassId, id]
    );
    return result;
  }
};

module.exports = Student;
