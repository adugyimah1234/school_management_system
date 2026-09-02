const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const expenseController = require("../controllers/expenseController");

router.get("/", protect, expenseController.getAllExpenses);
router.post("/", protect, isAdmin, expenseController.createExpense);
router.get("/summary", protect, expenseController.getExpenseSummary);
router.delete("/:id", protect, isAdmin, expenseController.deleteExpense);

module.exports = router;
