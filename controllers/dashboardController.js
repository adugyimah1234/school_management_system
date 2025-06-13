const db = require('../config/db');

async function getFinancialOverview(req, res) {
  try {
    // 1. Financial summary
    const [summaryRows] = await db.query(`
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

      // Dummy % changes — replace later with real logic
      totalCollectionsChange: 5.1,
      pendingPaymentsChange: -3.2,
      outstandingBalanceChange: -1.8,
      overduePaymentsChange: -0.9,
    };

    // 2. Collection progress (hardcoded target)
    const target = 10000;
    const collected = summary.totalCollections;
    const collectionProgress = {
      period: 'June 2025',
      target,
      collected,
      remaining: target - collected,
      percentage: (collected / target) * 100,
    };

    // 3. Recent transactions
    const [transactions] = await db.query(`
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

    const recentTransactions = transactions.map(tx => ({
      ...tx,
      date: new Date(tx.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }));

    res.json({
      summary,
      collectionProgress,
      recentTransactions,
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load financial overview' });
  }
}

module.exports = {
  getFinancialOverview,
};
