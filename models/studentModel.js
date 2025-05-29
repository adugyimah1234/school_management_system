const db = require('../config/db');

const Student = {
  getAll: callback => {
    db.query('SELECT * FROM students', callback);
  },
  create: (data, callback) => {
    db.query('INSERT INTO students SET ?', data, callback);
  }
};

exports.findByNameAndDOB = ( first_name, last_name, middle_name, dob, callback) => {
  const query = `SELECT * FROM students WHERE first_name = ?, last_name = ?, middle_name = ?, dob = ?`;
  db.query(query, [first_name, last_name, middle_name, dob], callback);
};

module.exports = Student;
