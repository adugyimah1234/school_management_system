const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, parentController.getAllParents);
router.post('/', protect, parentController.addParent);
router.get('/dashboard/:phone', protect, parentController.getParentDashboard);
router.post('/broadcast/:phone', protect, parentController.broadcastFamilyStatus);
router.get('/:studentId', protect, parentController.getParentByStudent);

module.exports = router;
