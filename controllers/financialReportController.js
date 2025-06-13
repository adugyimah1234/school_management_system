const db = require('../config/db');
// This module handles financial reporting.
// It exports functions to get a financial summary based on transaction methods and amounts within a specified date range.
// It also provides breakdowns of payment methods and summaries of payment request statuses.
// This route handles fetching financial summary reports based on date range.
// It retrieves the total amount for each payment method within the specified date range.
// It requires the start and end dates as query parameters.
// It returns a JSON response with the summary of amounts grouped by payment method.
// This route handles fetching financial summary reports based on date range.
// It retrieves the total amount for each payment method within the specified date range.
// It requires the start and end dates as query parameters.
// It returns a JSON response with the summary of amounts grouped by payment method.
// This route handles fetching financial summary reports based on date range.
// It retrieves the total amount for each payment method within the specified date range.
// It requires the start and end dates as query parameters.
// It returns a JSON response with the summary of amounts grouped by payment method.

async function getFinancialSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const [rows] = await db.query(
      `SELECT method, SUM(amount) AS total
       FROM transactions
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY method`,
      [startDate, endDate]
    );

    res.json({ summary: rows });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPaymentBreakdownByMethod(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM payment_breakdown_by_method');
    res.json({ methods: rows });
  } catch (err) {
    console.error('Breakdown error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// This route handles fetching payment request status summaries.  
async function getPaymentRequestStatusSummary(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM payment_request_status_summary');
    res.json({ statusSummary: rows });
  } catch (err) {
    console.error('Status summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}


module.exports = {
  getFinancialSummary,
  getPaymentBreakdownByMethod,
  getPaymentRequestStatusSummary,
};
// This module handles financial reporting.
// It exports a function to get a financial summary based on transaction methods and amounts within a specified date range.