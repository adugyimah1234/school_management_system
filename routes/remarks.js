const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const remarksController = require("../controllers/remarksController");

router.get("/", protect, remarksController.getRemarks);
router.post("/", protect, isAdmin, remarksController.createRemark);
router.delete("/:id", protect, isAdmin, remarksController.deleteRemark);

module.exports = router;
