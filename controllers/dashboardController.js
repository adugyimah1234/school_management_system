const db = require('../config/db');

async function getFinancialOverview(req, res) {
  try {
    // 1. Financial summary
    const [summaryRows] = await db.promise().query(`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS totalCollections,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pendingPayments,
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) AS outstandingBalance,
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) AS overduePayments
      FROM payment_requests
    `);

    const summary = {
      totalCollections: summaryRows[0].totalCollections || 0,
      pendingPayments: summaryRows[0].pendingPayments || 0,
      outstandingBalance: summaryRows[0].outstandingBalance || 0,
      overduePayments: summaryRows[0].overduePayments || 0,

      // Dummy % changes — implement real calculations later
      totalCollectionsChange: 5.1,
      pendingPaymentsChange: -3.2,
      outstandingBalanceChange: -1.8,
      overduePaymentsChange: -0.9,
    };

    // 2. Collection progress (dummy values for now)
    const collectionProgress = {
      period: 'June 2025',
      target: 10000,
      collected: summary.totalCollections,
      remaining: 10000 - summary.totalCollections,
      percentage: (summary.totalCollections / 10000) * 100,
    };

    // 3. Recent transactions
const [transactions] = await db.promise().query(`
  SELECT 
    t.id, 
    t.amount, 
    t.method AS type, 
    t.created_at AS date,
    CONCAT(s.first_name, ' ', s.last_name) AS student_name
  FROM transactions t
  LEFT JOIN payment_requests pr ON t.payment_request_id = pr.id
  LEFT JOIN students s ON pr.user_id = s.id
  WHERE s.id IS NOT NULL
  ORDER BY t.created_at DESC
  LIMIT 5
`);

    transactions.forEach(tx => {
      tx.date = new Date(tx.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    });

    res.json({
      summary,
      collectionProgress,
      recentTransactions: transactions,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load financial overview' });
  }
}

module.exports = {
  getFinancialOverview,
};
// This module handles the financial overview for the dashboard.
// It provides a summary of total collections, pending payments, outstanding balances, and overdue payments.
// It also includes collection progress and recent transactions.
// The financial overview is fetched from the database and returned as a JSON response.