const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { protect, isSuperAdmin } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure Multer for branding logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/branding');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `institutional_logo_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

/**
 * PUBLIC/AUTHENTICATED ACCESSIBLE ROUTES
 * These routes are needed by all users regardless of role
 */
router.get('/branding', protect, superAdminController.getBranding);

/**
 * SUPER ADMIN RESTRICTED ROUTES
 */
router.use(protect, isSuperAdmin);

// Dashboard overview
router.get('/dashboard', superAdminController.getExecutiveOverview);

// Garrison management
router.get('/garrisons', superAdminController.getAllGarrisons);
router.post('/garrisons', superAdminController.createGarrison);
router.put('/garrisons/:id', superAdminController.updateGarrison);
router.delete('/garrisons/:id', superAdminController.deleteGarrison);

// Institutional Governance
router.put('/branding', upload.single('logo'), superAdminController.updateBranding);
router.put('/grade-governance', superAdminController.updateGradeGovernance);

// Communication Nodes (SMS & Email)
router.get('/communication-settings', superAdminController.getCommunicationSettings);
router.put('/communication-settings', superAdminController.updateCommunicationSettings);

// API Gateway
router.get('/api-token', superAdminController.getApiToken);
router.post('/api-token/regenerate', superAdminController.regenerateApiToken);

// Profile
router.put('/profile', superAdminController.updateAdminProfile);

// Garrison Director accounts
router.get('/garrison-directors', superAdminController.getGarrisonDirectors);
router.post('/garrison-directors', superAdminController.createGarrisonDirector);

// Garrison News
router.get('/garrisons/:garrisonId/news', superAdminController.getGarrisonNews);
router.post('/garrisons/:garrisonId/news', superAdminController.createGarrisonNews);
router.delete('/garrisons/news/:id', superAdminController.deleteGarrisonNews);

// Audit Logs
router.get('/audit-logs', superAdminController.getAuditLogs);

module.exports = router;
