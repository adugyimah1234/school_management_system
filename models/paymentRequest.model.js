const db = require('../config/db');

async function getPaymentRequestById(id) {
  const [rows] = await db.query('SELECT * FROM payment_requests WHERE id = ?', [id]);
  return rows[0];
}

async function markPaymentAsPaid(id) {
  await db.query('UPDATE payment_requests SET status = ? WHERE id = ?', ['paid', id]);
}

module.exports = {
  getPaymentRequestById,
  markPaymentAsPaid,
};
