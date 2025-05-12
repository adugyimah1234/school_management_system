const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');

router.post('/', parentController.addParent);
router.get('/:studentId', parentController.getParentByStudent);

module.exports = router;
