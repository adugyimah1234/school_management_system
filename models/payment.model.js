const db = require('../config/db');

/**
 * Record a new transaction
 * @param {number} paymentRequestId - Linked payment_request.id
 * @param {number} amount - Amount paid
 * @param {string} method - Payment method (e.g., 'cash', 'card', 'momo')
 * @param {string} transactionRef - Reference string
 */
async function recordTransaction(paymentRequestId, amount, method, transactionRef) {
  await db.query(
    `INSERT INTO transactions 
     (payment_request_id, amount, method, transaction_ref, created_at) 
     VALUES (?, ?, ?, ?, NOW())`,
    [paymentRequestId, amount, method, transactionRef]
  );
}

module.exports = {
  recordTransaction,
};
