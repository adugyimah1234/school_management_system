const financialService = require("../services/financialService");
const logger = require("../utils/logger");
const response = require("../utils/apiResponse");

/**
 * Payment Controller
 */

exports.getAllPayments = async (req, res, next) => {
  try {
    const payments = await financialService.getAllPayments(req.query, req.user);
    return response.success(res, payments, "Payments fetched successfully");
  } catch (err) {
    next(err);
  }
};

exports.getPayment = async (req, res, next) => {
  try {
    const payment = await financialService.getPaymentById(req.params.id);
    if (!payment) return response.error(res, "Payment not found", 404);
    return response.success(res, payment);
  } catch (err) {
    next(err);
  }
};

exports.createPayment = async (req, res, next) => {
  try {
    const result = await financialService.recordPayment(req.body, req.user);
    return response.success(res, result, 'Payment recorded successfully', 201);
  } catch (err) {
    logger.error("Payment recording error: " + err.message);
    next(err);
  }
};

exports.getStudentPaymentHistory = async (req, res, next) => {
  try {
    const history = await financialService.getStudentFinancialSummary(req.params.studentId);
    return response.success(res, history, "Payment history fetched successfully");
  } catch (err) {
    next(err);
  }
};
