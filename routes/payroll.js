const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const payrollController = require("../controllers/payrollController");

router.use(protect, isAdmin); // Payroll is highly sensitive

router.get("/settings", payrollController.getStaffSettings);
router.post("/settings", payrollController.updateSettings);

router.post("/generate", payrollController.generateDraft);
router.get("/history", payrollController.getHistory);
router.patch("/:id/pay", payrollController.payStaff);

module.exports = router;
