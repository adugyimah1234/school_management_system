const db = require('../config/db');

const Student = {
  getAll: callback => {
    db.query('SELECT * FROM students', callback);
  },
  create: (data, callback) => {
    db.query('INSERT INTO students SET ?', data, callback);
  }
};

module.exports = Student;
