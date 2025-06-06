const express = require('express');
const {
  getFinancialSummary,
  getPaymentBreakdownByMethod,
  getPaymentRequestStatusSummary,
} = require('../controllers/financialReportController');

const reportRouter = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};
reportRouter.get('/summary', isAdmin, getFinancialSummary);
reportRouter.get('/method-breakdown', isAdmin, getPaymentBreakdownByMethod);
reportRouter.get('/request-status-summary', isAdmin, getPaymentRequestStatusSummary);

module.exports = reportRouter;
// This module defines routes for financial reporting.
// It includes endpoints for fetching financial summaries, payment breakdowns by method, and payment request status summaries.
// This route handles fetching financial summary reports based on date range.