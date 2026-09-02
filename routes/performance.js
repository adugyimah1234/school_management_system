const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const performanceController = require("../controllers/teacherPerformanceController");

router.post("/check-in", protect, performanceController.checkIn);
router.post("/check-out", protect, performanceController.checkOut);

// Admin only views
router.get("/registry", protect, isAdmin, performanceController.getRegistry);
router.get("/stats/:userId", protect, isAdmin, performanceController.getStaffStats);

module.exports = router;
