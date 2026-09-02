const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, assessmentController.getAllAssessments);
router.get('/:id', protect, assessmentController.getAssessmentById);
router.post('/', protect, assessmentController.createAssessment);
router.put('/:id', protect, assessmentController.updateAssessment);
router.delete('/:id', protect, assessmentController.deleteAssessment);

module.exports = router;
