// routes/schools.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware');

// Helper function to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

/**
 * @route   GET /api/schools
 * @desc    Get all schools for dropdowns
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const [schools] = await db.query(
      'SELECT id, name, address, phone_number, email FROM schools ORDER BY name ASC'
    );
    res.json(schools);
  } catch (err) {
    console.error('Error fetching schools:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/schools/:id
 * @desc    Get a specific school's details
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [schools] = await db.query(
      'SELECT id, name, address, phone_number, email FROM schools WHERE id = ?',
      [id]
    );
    
    if (schools.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    res.json(schools[0]);
  } catch (err) {
    console.error('Error fetching school details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/schools
 * @desc    Create a new school
 * @access  Private (Admin only)
 */
router.post('/', protect, isAdmin, async (req, res) => {
  const { name, address, phone_number, email } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'School name is required' });
  }
  
  try {
    const [result] = await db.query(
      'INSERT INTO schools (name, address, phone_number, email) VALUES (?, ?, ?, ?)',
      [name, address, phone_number, email]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'School created successfully'
    });
  } catch (err) {
    console.error('Error creating school:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/schools/:id
 * @desc    Update a school
 * @access  Private (Admin only)
 */
router.put('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, address, phone_number, email } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'School name is required' });
  }
  
  try {
    const [result] = await db.query(
      'UPDATE schools SET name = ?, address = ?, phone_number = ?, email = ? WHERE id = ?',
      [name, address, phone_number, email, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    res.json({
      message: 'School updated successfully',
      changes: result.affectedRows
    });
  } catch (err) {
    console.error('Error updating school:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/schools/:id
 * @desc    Delete a school
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if school has any classes
    const [classes] = await db.query(
      'SELECT COUNT(*) as count FROM classes WHERE school_id = ?',
      [id]
    );
    
    if (classes[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete school that has classes. Please delete all classes first.'
      });
    }
    
    const [result] = await db.query(
      'DELETE FROM schools WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    res.json({ message: 'School deleted successfully' });
  } catch (err) {
    console.error('Error deleting school:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
