const express = require('express');
const router = express.Router();
const db = require('../config/db'); // adjust path if needed

// ✅ GET all fee presets
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM fee_presets ORDER BY type, class_name');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching fee presets:', err);
    res.status(500).json({ error: 'Failed to fetch fee presets' });
  }
});

// ✅ Optional: GET fee presets by type (if needed)
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM fee_presets WHERE type = ?', [type]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching fee presets by type:', err);
    res.status(500).json({ error: 'Failed to fetch fee presets' });
  }
});

module.exports = router;
