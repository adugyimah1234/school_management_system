const db = require('../config/db');

const Admission = {
  create: (data, callback) => {
    db.query('INSERT INTO admissions SET ?', data, callback);
  },
  getByStudentId: (studentId, callback) => {
    db.query('SELECT * FROM admissions WHERE student_id = ?', [studentId], callback);
  }
};

module.exports = Admission;
