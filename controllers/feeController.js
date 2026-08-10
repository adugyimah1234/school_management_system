const financialService = require("../services/financialService");
const logger = require("../utils/logger");
const response = require("../utils/apiResponse");

/**
 * Fee Controller
 */

exports.getFee = async (req, res, next) => {
  try {
    const fees = await financialService.getAllFees(req.query, req.user);
    return response.success(res, fees);
  } catch (err) {
    next(err);
  }
};

exports.getAllFees = async (req, res, next) => {
  try {
    const fees = await financialService.getAllFees(req.query, req.user);
    return response.success(res, fees, "Fees fetched successfully");
  } catch (err) {
    next(err);
  }
};

exports.createFee = async (req, res, next) => {
  try {
    const fee = await financialService.createFee(req.body, req.user);
    return response.success(res, fee, 'Fee structure created successfully', 201);
  } catch (err) {
    logger.error("Fee creation error: " + err.message);
    next(err);
  }
};

exports.updateFee = async (req, res, next) => {
  try {
    await financialService.updateFee(req.params.id, req.body, req.user);
    return response.success(res, null, 'Fee updated successfully');
  } catch (err) {
    next(err);
  }
};

exports.deleteFee = async (req, res, next) => {
  try {
    await financialService.deleteFee(req.params.id, req.user);
    return response.success(res, null, 'Fee deleted successfully');
  } catch (err) {
    next(err);
  }
};

exports.getOutstandingFees = async (req, res, next) => {
  try {
    const summary = await financialService.getStudentFinancialSummary(req.params.studentId);
    return response.success(res, summary, "Outstanding fees fetched successfully");
  } catch (err) {
    next(err);
  }
};

exports.getDebtLedger = async (req, res, next) => {
  try {
    const ledger = await financialService.getDebtLedger(req.user);
    return response.success(res, ledger, "Debt ledger fetched successfully");
  } catch (err) {
    next(err);
  }
};

exports.sendDebtReminders = async (req, res, next) => {
  try {
    const { studentIds } = req.body;
    const result = await financialService.sendBulkDebtReminder(studentIds, req.user);
    return response.success(res, result, "Debt reminders transmitted");
  } catch (err) {
    next(err);
  }
};
