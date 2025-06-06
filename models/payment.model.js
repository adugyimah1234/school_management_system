const db = require('../config/db');

async function recordTransaction(paymentRequestId, amount, method, transactionRef) {
  await db.promise().query(
    'INSERT INTO transactions (payment_request_id, amount, method, transaction_ref, created_at) VALUES (?, ?, ?, ?, NOW())',
    [paymentRequestId, amount, method, transactionRef]
  );
}

module.exports = {
  recordTransaction,
};
// This module handles recording transactions in the database.
// It exports a function to record a transaction with details like payment request ID, amount, method, and transaction reference.