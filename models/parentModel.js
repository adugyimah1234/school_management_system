const db = require('../config/db');

const Parent = {
  create: (data, callback) => {
    db.query('INSERT INTO parents SET ?', data, callback);
  },
  getByStudentId: (studentId, callback) => {
    db.query('SELECT * FROM parents WHERE student_id = ?', [studentId], callback);
  }
};

module.exports = Parent;
