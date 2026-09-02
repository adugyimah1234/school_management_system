const momoService = require("../services/momoService");
const response = require("../utils/apiResponse");

exports.reconcileStatement = async (req, res, next) => {
    try {
        const { transactions } = req.body;
        if (!Array.isArray(transactions)) {
            return res.status(400).json({ error: "Invalid transaction list" });
        }

        const results = await momoService.reconcile(transactions, req.user);
        return response.success(res, results, "Reconciliation process completed");
    } catch (err) {
        next(err);
    }
};
