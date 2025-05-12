const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all registrations
router.get('/', (req, res) => {
  db.query('SELECT * FROM registrations', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Register a student
router.post('/', (req, res) => {
  const { student_id, class_id, academic_year } = req.body;
  db.query(
    'INSERT INTO registrations (student_id, class_id, academic_year) VALUES (?, ?, ?)',
    [student_id, class_id, academic_year],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

module.exports = router;