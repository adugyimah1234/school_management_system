const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const momoController = require("../controllers/momoController");

router.post("/reconcile", protect, isAdmin, momoController.reconcileStatement);

module.exports = router;
