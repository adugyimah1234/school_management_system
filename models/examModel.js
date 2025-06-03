const db = require('../config/db'); // Your MySQL connection file

const Exam = {
  getAll: (callback) => {
    db.query('SELECT * FROM exams', callback);
  },

  getById: (id, callback) => {
    db.query('SELECT * FROM exams WHERE id = ?', [id], callback);
  },

  create: (data, callback) => {
    const { class_id, category_id, name, date, venue } = data;
    db.query(
      'INSERT INTO exams (class_id, category_id, name, date, venue) VALUES (?, ?, ?, ?, ?)',
      [class_id, category_id, name, date, venue],
      callback
    );
  },

  update: (id, data, callback) => {
    const { class_id, category_id, name, date, venue } = data;
    db.query(
      'UPDATE exams SET class_id = ?, category_id = ?, name = ?, date = ?, venue = ? WHERE id = ?',
      [class_id, category_id, name, date, venue, id],
      callback
    );
  },

  delete: (id, callback) => {
    db.query('DELETE FROM exams WHERE id = ?', [id], callback);
  }
};

module.exports = Exam;
