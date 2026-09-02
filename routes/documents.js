const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

router.get('/', protect, documentController.getDocuments);
router.post('/', protect, isAdmin, documentController.addDocument);
router.delete('/:id', protect, isAdmin, documentController.deleteDocument);

module.exports = router;
