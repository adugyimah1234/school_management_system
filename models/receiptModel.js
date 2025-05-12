const db = require('../config/db');

const Receipt = {
  create: (data, callback) => {
    db.query('INSERT INTO receipts SET ?', data, callback);
  },
  getByStudentId: (studentId, callback) => {
    db.query('SELECT * FROM receipts WHERE student_id = ?', [studentId], callback);
  }
};

module.exports = Receipt;
