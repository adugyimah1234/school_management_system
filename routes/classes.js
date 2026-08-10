
// routes/classes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

// Helper function to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  const role = (req.user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
  if (role !== 'admin' && role !== 'superadmin' && role !== 'schooladmin') {
    return res.status(403).json({ error: 'Access denied. Administrative role required.' });
  }
  next();
};

/**
 * @route   GET /api/classes
 * @desc    Get all classes with optional school_id filter
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { school_id, category_id } = req.query;
    const user = req.user;

    let query = `
      SELECT c.*, s.name as school_name 
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.id
    `;
    
    const queryParams = [];
    const conditions = [];

    // Tenant Isolation
    if (user && user.role) {
      const role = user.role.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
      if (role !== 'superadmin') {
        if (user.garrison_id) {
          conditions.push('c.garrison_id = ?');
          queryParams.push(user.garrison_id);
        }
      }
    }
    
    if (school_id) {
      conditions.push('c.school_id = ?');
      queryParams.push(school_id);
    }
    
    if (category_id) {
      conditions.push('EXISTS (SELECT 1 FROM assessments a WHERE a.class_id = c.id AND a.category_id = ?)');
      queryParams.push(category_id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY c.name ASC';
    
    const [classes] = await db.query(query, queryParams);
    
    res.json(classes);
  } catch (err) {
    logger.error('Error fetching classes: ' + err.message);
    res.status(500).json({ error: 'Internal server error while fetching classes' });
  }
});

/**
 * @route   GET /api/classes/:id
 * @desc    Get specific class details with its assessments
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [classResults] = await db.query(
      `SELECT c.*, s.name as school_name 
       FROM classes c
       LEFT JOIN schools s ON c.school_id = s.id
       WHERE c.id = ?`,
      [id]
    );
    
    if (classResults.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const classData = classResults[0];
    
    const [assessments] = await db.query(
      `SELECT a.*, cat.name as category_name
       FROM assessments a
       LEFT JOIN categories cat ON a.category_id = cat.id
       WHERE a.class_id = ?
       ORDER BY a.date ASC`,
      [id]
    );
    
    res.json({
      ...classData,
      assessments
    });
  } catch (err) {
    logger.error('Error fetching class details: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/classes
 * @desc    Create a new class
 * @access  Private (Admin only)
 */
router.post('/', protect, isAdmin, async (req, res) => {
  const { name, slots, school_id, garrison_id } = req.body;
  
  if (!name || !school_id) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: name, school_id'
    });
  }

  try {
    const [schoolExists] = await db.query(
      'SELECT id, garrison_id FROM schools WHERE id = ?',
      [school_id]
    );
    
    if (schoolExists.length === 0) {
      return res.status(400).json({ error: 'Invalid school ID' });
    }
    
    const finalGarrisonId = garrison_id || schoolExists[0].garrison_id || req.user.garrison_id;

    if (!finalGarrisonId) {
      return res.status(400).json({ error: 'Garrison ID is required for class creation' });
    }

    const [existingClass] = await db.query(
      'SELECT id FROM classes WHERE name = ? AND school_id = ?',
      [name, school_id]
    );
    
    if (existingClass.length > 0) {
      return res.status(400).json({ 
        error: 'A class with this name already exists for the selected school' 
      });
    }
    
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO classes (id, name, slots, school_id, garrison_id) VALUES (?, ?, ?, ?, ?)',
      [id, name, slots || 0, school_id, finalGarrisonId]
    );
    
    res.status(201).json({ id, message: 'Class created successfully' });
  } catch (err) {
    logger.error('Error creating class: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/classes/:id
 * @desc    Update class information
 * @access  Private (Admin only)
 */
router.put('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, slots, school_id } = req.body;
  
  if (!name || !school_id) {
    return res.status(400).json({ error: 'Please provide name and school_id' });
  }

  try {
    const [classExists] = await db.query('SELECT id FROM classes WHERE id = ?', [id]);
    if (classExists.length === 0) return res.status(404).json({ error: 'Class not found' });
    
    const [result] = await db.query(
      'UPDATE classes SET name = ?, slots = ?, school_id = ? WHERE id = ?',
      [name, slots || 0, school_id, id]
    );
    
    res.json({ message: 'Class updated successfully' });
  } catch (err) {
    logger.error('Error updating class: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete a class
 */
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [classExists] = await db.query('SELECT id FROM classes WHERE id = ?', [id]);
    if (classExists.length === 0) return res.status(404).json({ error: 'Class not found' });
    
    const [assessments] = await db.query('SELECT COUNT(*) as count FROM assessments WHERE class_id = ?', [id]);
    if (assessments[0].count > 0) return res.status(400).json({ error: 'Class has scheduled assessments.' });
    
    const [students] = await db.query('SELECT COUNT(*) as count FROM students WHERE class_id = ?', [id]);
    if (students[0].count > 0) return res.status(400).json({ error: 'Class has assigned students.' });
    
    await db.query('DELETE FROM classes WHERE id = ?', [id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    logger.error('Error deleting class: ' + err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
