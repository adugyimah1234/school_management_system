const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { protect } = require('../middlewares/authMiddleware');

// Define routes for settings
router.get('/', protect, settingController.getAllSettings);
router.get('/group/:groupName', protect, settingController.getSettingsByGroup);
router.post('/', protect, settingController.createSetting);
router.put('/:id', protect, settingController.updateSetting);
router.delete('/:id', protect, settingController.deleteSetting);

module.exports = router;
