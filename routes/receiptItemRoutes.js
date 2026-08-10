// routes/receiptItemRoutes.js
const express = require('express');
const router = express.Router();
const receiptItemController = require('../controllers/receiptItemController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/category-stats', protect, receiptItemController.getCategoryStats);

module.exports = router;
