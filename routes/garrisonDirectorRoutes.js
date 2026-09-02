const express = require('express');
const router = express.Router();
const garrisonDirectorController = require('../controllers/garrisonDirectorController');
const { protect, isGarrisonDirector } = require('../middlewares/authMiddleware');

// All routes require Garrison Director role
router.use(protect, isGarrisonDirector);

// Dashboard overview for assigned Garrison
router.get('/dashboard', garrisonDirectorController.getGarrisonOverview);

// School creation & listing for Garrison Director
router.get('/schools', garrisonDirectorController.getGarrisonSchools);
router.post('/schools', garrisonDirectorController.createSchoolForGarrison);

// School Admin provisioning
router.post('/school-admins', garrisonDirectorController.createSchoolAdmin);

module.exports = router;
