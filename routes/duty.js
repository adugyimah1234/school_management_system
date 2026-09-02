const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const dutyController = require("../controllers/dutyController");

router.get("/", protect, dutyController.getRoster);
router.post("/", protect, isAdmin, dutyController.createDuty);
router.post("/broadcast", protect, isAdmin, dutyController.broadcastRoster);
router.delete("/:id", protect, isAdmin, dutyController.deleteDuty);

module.exports = router;
