const db = require('../config/db');

const Payment = {
  recordPayment: (data, callback) => {
    db.query('INSERT INTO tuition_payments SET ?', data, callback);
  },
  getPaymentsByStudent: (studentId, callback) => {
    db.query('SELECT * FROM tuition_payments WHERE student_id = ?', [studentId], callback);
  }
};

module.exports = Payment;
