const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all branches
router.get('/', (req, res) => {
  db.query('SELECT * FROM branches', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Add a new branch
router.post('/', (req, res) => {
  const { name, location } = req.body;
  db.query('INSERT INTO branches (name, location) VALUES (?, ?)', [name, location], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId });
  });
});

module.exports = router;