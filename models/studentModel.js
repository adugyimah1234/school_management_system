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
    // Make sure jersey_size is included in studentData if provided
    const [result] = await db.query('INSERT INTO students SET ?', [studentData]);
    return result;
  },

  async update(id, studentData) {
    // Add this method if not present, or update it to include jersey_size
    const [result] = await db.query('UPDATE students SET ? WHERE id = ?', [studentData, id]);
    return result;
  },

  async delete(id) {
    const [result] = await db.query('DELETE FROM students WHERE id = ?', [id]);
    return result;
  },

    async promote(id) {
      // Example: increment class_id by 1 (adjust logic as needed)
      const [result] = await db.query(
        'UPDATE students SET class_id = class_id + 1 WHERE id = ?',
        [id]
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
