const express = require('express');
const { getFinancialOverview } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/financial-overview', getFinancialOverview);

module.exports = router;
// This module defines a route for fetching the financial overview of the dashboard.
// It includes an endpoint that retrieves financial data for the dashboard, such as total revenue, expenses, and profit.