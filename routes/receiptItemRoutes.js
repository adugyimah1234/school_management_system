// routes/receiptItemRoutes.js
const express = require('express');
const router = express.Router();
const receiptItemController = require('../controllers/receiptItemController');

router.get('/category-stats', receiptItemController.getCategoryStats);

module.exports = router;
