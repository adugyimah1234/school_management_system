const dashboardService = require('../services/dashboardService');
const response = require('../utils/apiResponse');

async function getFinancialOverview(req, res, next) {
  try {
    const data = await dashboardService.getFinancialOverview(req.user);
    return response.success(res, data, 'Dashboard data fetched successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFinancialOverview,
};
