const expenseService = require("../services/expenseService");
const response = require("../utils/apiResponse");

exports.getAllExpenses = async (req, res, next) => {
    try {
        const expenses = await expenseService.getAllExpenses(req.user, req.query);
        return response.success(res, expenses);
    } catch (err) {
        next(err);
    }
};

exports.createExpense = async (req, res, next) => {
    try {
        const expense = await expenseService.createExpense(req.body, req.user);
        return response.success(res, expense, "Expense recorded successfully", 201);
    } catch (err) {
        next(err);
    }
};

exports.deleteExpense = async (req, res, next) => {
    try {
        await expenseService.deleteExpense(req.params.id);
        return response.success(res, null, "Expense record deleted");
    } catch (err) {
        next(err);
    }
};

exports.getExpenseSummary = async (req, res, next) => {
    try {
        const summary = await expenseService.getSummary(req.user);
        return response.success(res, summary);
    } catch (err) {
        next(err);
    }
};
