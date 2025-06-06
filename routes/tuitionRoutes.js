const express = require('express');
const router = express.Router();
const tuitionController = require('../controllers/tuitionController');

router.post('/pay', tuitionController.payTuition);

module.exports = router;
