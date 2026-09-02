const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const disciplineController = require("../controllers/disciplineController");

router.get("/student/:studentId", protect, disciplineController.getStudentLogs);
router.post("/", protect, disciplineController.createLog);

module.exports = router;
