const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const exeatController = require("../controllers/exeatController");

router.get("/", protect, exeatController.getAllExeats);
router.post("/", protect, exeatController.createExeat);
router.patch("/:id/status", protect, exeatController.updateStatus);
router.delete("/:id", protect, isAdmin, exeatController.deleteExeat);

module.exports = router;
