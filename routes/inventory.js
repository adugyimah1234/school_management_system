const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middlewares/authMiddleware");
const inventoryController = require("../controllers/inventoryController");

router.get("/", protect, inventoryController.getAllItems);
router.get("/report", protect, inventoryController.getInventoryReport);
router.post("/", protect, isAdmin, inventoryController.createItem);
router.put("/:id", protect, isAdmin, inventoryController.updateItem);
router.delete("/:id", protect, isAdmin, inventoryController.deleteItem);
router.post("/sale", protect, inventoryController.recordSale);

module.exports = router;
