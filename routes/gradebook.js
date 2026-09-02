const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const gradebookController = require("../controllers/gradebookController");

router.get("/subjects", protect, gradebookController.getSubjects);
router.post("/subjects", protect, isAdmin, gradebookController.createSubject);
router.delete("/subjects/:id", protect, isAdmin, gradebookController.deleteSubject);

router.get("/terms", protect, gradebookController.getTerms);
router.post("/terms", protect, isAdmin, gradebookController.createTerm);
router.delete("/terms/:id", protect, isAdmin, gradebookController.deleteTerm);

router.get("/marks", protect, gradebookController.getClassMarks);
router.post("/marks", protect, gradebookController.saveMarks);

router.get("/report/:studentId/:termId", protect, gradebookController.getReportCard);
router.post("/broadcast", protect, isAdmin, gradebookController.broadcastResults);

module.exports = router;
