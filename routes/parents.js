const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/', protect, parentController.addParent);
router.get('/:studentId', protect, parentController.getParentByStudent);

module.exports = router;
