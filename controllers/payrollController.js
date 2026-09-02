const payrollService = require("../services/payrollService");
const response = require("../utils/apiResponse");

exports.getStaffSettings = async (req, res, next) => {
    try {
        const settings = await payrollService.getStaffPayrollSettings(req.user);
        return response.success(res, settings);
    } catch (err) {
        next(err);
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        await payrollService.updatePayrollSettings(req.body);
        return response.success(res, null, "Payroll configuration updated");
    } catch (err) {
        next(err);
    }
};

exports.generateDraft = async (req, res, next) => {
    try {
        const { month, year } = req.body;
        const results = await payrollService.generateMonthlyDraft(month, year, req.user);
        return response.success(res, results, "Monthly payroll draft generated");
    } catch (err) {
        next(err);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const history = await payrollService.getPayrollHistory(month, year, req.user);
        return response.success(res, history);
    } catch (err) {
        next(err);
    }
};

exports.payStaff = async (req, res, next) => {
    try {
        await payrollService.processPayment(req.params.id, req.user);
        return response.success(res, null, "Payment successfully processed and audited");
    } catch (err) {
        next(err);
    }
};
