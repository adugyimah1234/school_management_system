// routes/classes.js
const express = require('express');
const router = express.Router();

// Sample route to get all classes
router.get('/', (req, res) => {
  res.json({ message: 'Get all classes' });
});

module.exports = router;
