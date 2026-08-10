// routes/academicYears.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// The local isAdmin function was redundant and less robust
// router.post('/', protect, isAdmin, ...)

// Get all academic years - accessible to any authenticated user
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;
    let query = 'SELECT * FROM academic_years';
    let params = [];

    if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
      if (user.garrison_id) {
        query += ' WHERE garrison_id = ? OR garrison_id IS NULL';
        params = [user.garrison_id];
      }
    }

    query += ' ORDER BY start_date DESC';

    const [results] = await db.query(query, params);
    res.json(results);
  } catch (err) {
    console.error('Error fetching academic years:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get specific academic year by ID
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [results] = await db.query(
      'SELECT * FROM academic_years WHERE id = ?', 
      [id]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Academic year not found' });
    }
    
    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching academic year:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new academic year - admin only
router.post('/', protect, isAdmin, async (req, res) => {
  const { year, start_date, end_date, is_active } = req.body;
  
  // Validate required fields
  if (!year || !start_date || !end_date) {
    return res.status(400).json({
      error: 'Please provide all required fields: year, start_date, end_date'
    });
  }
  
  // Validate dates
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ 
      error: 'Invalid date format. Please use YYYY-MM-DD format.' 
    });
  }
  
  if (startDate >= endDate) {
    return res.status(400).json({ 
      error: 'End date must be after start date' 
    });
  }
  
  try {
    // If is_active is true, set all other academic years in THIS garrison to inactive
    if (is_active) {
      const garrison_id = req.user ? req.user.garrison_id : null;
      await db.query(
        'UPDATE academic_years SET is_active = false WHERE garrison_id = ? AND is_active = true',
        [garrison_id]
      );
    }
    
    // Set default value for is_active if not provided
    const activeStatus = is_active !== undefined ? is_active : false;
    const garrison_id = req.user ? req.user.garrison_id : null;

    const crypto = require('crypto');
    const id = crypto.randomUUID();

    // Insert new academic year
    await db.query(
      'INSERT INTO academic_years (id, year, start_date, end_date, is_active, garrison_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, year, start_date, end_date, activeStatus, garrison_id]
    );
    
    res.status(201).json({
      id: id,
      message: 'Academic year created successfully'
    });
  } catch (err) {
    console.error('Error creating academic year:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update academic year - admin only
router.put('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { year, start_date, end_date, is_active } = req.body;

  // Validate required fields
  if (!year || !start_date || !end_date) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: year, start_date, end_date' 
    });
  }
  
  // Validate dates
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ 
      error: 'Invalid date format. Please use YYYY-MM-DD format.' 
    });
  }
  
  if (startDate >= endDate) {
    return res.status(400).json({ 
      error: 'End date must be after start date' 
    });
  }
  
  try {
    // Check if academic year exists
    const [existingYear] = await db.query(
      'SELECT * FROM academic_years WHERE id = ?',
      [id]
    );
    
    if (existingYear.length === 0) {
      return res.status(404).json({ error: 'Academic year not found' });
    }
    
    // If setting this year to active, set all others in THIS garrison to inactive
    if (is_active) {
      const garrison_id = req.user ? req.user.garrison_id : null;
      await db.query(
        'UPDATE academic_years SET is_active = false WHERE id != ? AND garrison_id = ?',
        [id, garrison_id]
      );
    }
    
    // Update the academic year
    const [result] = await db.query(
      'UPDATE academic_years SET year = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?',
      [year, start_date, end_date, is_active !== undefined ? is_active : false, id]
    );
    
    res.json({ 
      message: 'Academic year updated successfully',
      changes: result.affectedRows
    });
  } catch (err) {
    console.error('Error updating academic year:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete academic year - admin only
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if academic year exists
    const [existingYear] = await db.query(
      'SELECT * FROM academic_years WHERE id = ?',
      [id]
    );
    
    if (existingYear.length === 0) {
      return res.status(404).json({ error: 'Academic year not found' });
    }
    
    // Check if academic year is referenced by registrations
    const [registrations] = await db.query(
      'SELECT COUNT(*) as count FROM registrations WHERE academic_year_id = ?',
      [id]
    );
    
    if (registrations[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete academic year that is referenced by registrations' 
      });
    }
    
    // Delete the academic year
    await db.query(
      'DELETE FROM academic_years WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Academic year deleted successfully' });
  } catch (err) {
    console.error('Error deleting academic year:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

