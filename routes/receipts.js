const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const upload = require('../middlewares/uploadMiddleware');
const { protect } = require('../middlewares/authMiddleware');

// Use existing controller functions
router.post('/', protect, receiptController.createReceipt);
router.get('/:id', protect, receiptController.getReceipt);  // Changed from getReceiptsByStudent to getReceipt
router.get('/', protect, receiptController.getAllReceipts);  // Add route to get all receipts
router.get('/:id/print', protect, receiptController.getPrintableReceipt);  // Add route for printable receipt

// Upload route
router.post('/upload-logo', protect, upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const logoUrl = `/uploads/logos/${req.file.filename}`;
  res.status(201).json({ message: 'Logo uploaded', logo_url: logoUrl });
});
module.exports = router;
