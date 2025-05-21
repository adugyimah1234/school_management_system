
// routes/classes.js
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
 * @route   GET /api/classes
 * @desc    Get all classes with optional school_id filter
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { school_id, category_id } = req.query;
    
    let query = `
      SELECT c.*, s.name as school_name 
      FROM classes c
      JOIN schools s ON c.school_id = s.id
    `;
    
    const queryParams = [];
    
    // Start building WHERE clause if needed
    let whereClauseStarted = false;
    
    if (school_id) {
      query += ' WHERE c.school_id = ?';
      queryParams.push(school_id);
      whereClauseStarted = true;
    }
    
    // Add category filter if available
    if (category_id) {
      // Check if we already have a WHERE clause
      if (whereClauseStarted) {
        query += ' AND EXISTS (SELECT 1 FROM exams e WHERE e.class_id = c.id AND e.category_id = ?)';
      } else {
        query += ' WHERE EXISTS (SELECT 1 FROM exams e WHERE e.class_id = c.id AND e.category_id = ?)';
      }
      queryParams.push(category_id);
    }
    
    query += ' ORDER BY c.level ASC, c.name ASC';
    
    const [classes] = await db.promise().query(query, queryParams);
    
    res.json(classes);
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/classes/:id
 * @desc    Get specific class details with its exams
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get class details
    const [classResults] = await db.promise().query(
      `SELECT c.*, s.name as school_name 
       FROM classes c
       JOIN schools s ON c.school_id = s.id
       WHERE c.id = ?`,
      [id]
    );
    
    if (classResults.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const classData = classResults[0];
    
    // Get exams for this class
    const [exams] = await db.promise().query(
      `SELECT e.*, c.name as category_name
       FROM exams e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.class_id = ?
       ORDER BY e.date ASC`,
      [id]
    );
    
    // Return class with its exams
    res.json({
      ...classData,
      exams
    });
  } catch (err) {
    console.error('Error fetching class details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/classes
 * @desc    Create a new class
 * @access  Private (Admin only)
 */
router.post('/', protect, isAdmin, async (req, res) => {
  const { name, level, school_id } = req.body;
  
  // Validate required fields
  if (!name || !level || !school_id) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: name, level, school_id' 
    });
  }
  
  // Validate data types
  if (isNaN(Number(level)) || isNaN(Number(school_id))) {
    return res.status(400).json({
      error: 'Level and school_id must be numeric values'
    });
  }
  
  try {
    // Verify school exists
    const [schoolExists] = await db.promise().query(
      'SELECT id FROM schools WHERE id = ?',
      [school_id]
    );
    
    if (schoolExists.length === 0) {
      return res.status(400).json({ error: 'Invalid school ID' });
    }
    
    // Check for duplicate class name in the same school
    const [existingClass] = await db.promise().query(
      'SELECT id FROM classes WHERE name = ? AND school_id = ?',
      [name, school_id]
    );
    
    if (existingClass.length > 0) {
      return res.status(400).json({ 
        error: 'A class with this name already exists for the selected school' 
      });
    }
    
    // Create new class
    const [result] = await db.promise().query(
      'INSERT INTO classes (name, level, school_id) VALUES (?, ?, ?)',
      [name, level, school_id]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'Class created successfully'
    });
  } catch (err) {
    console.error('Error creating class:', err);
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
  const { name, level, school_id } = req.body;
  
  // Validate required fields
  if (!name || !level || !school_id) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: name, level, school_id' 
    });
  }
  
  // Validate data types
  if (isNaN(Number(level)) || isNaN(Number(school_id))) {
    return res.status(400).json({
      error: 'Level and school_id must be numeric values'
    });
  }
  
  try {
    // Verify class exists
    const [classExists] = await db.promise().query(
      'SELECT id FROM classes WHERE id = ?',
      [id]
    );
    
    if (classExists.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Verify school exists
    const [schoolExists] = await db.promise().query(
      'SELECT id FROM schools WHERE id = ?',
      [school_id]
    );
    
    if (schoolExists.length === 0) {
      return res.status(400).json({ error: 'Invalid school ID' });
    }
    
    // Check for duplicate class name in the same school (excluding current class)
    const [existingClass] = await db.promise().query(
      'SELECT id FROM classes WHERE name = ? AND school_id = ? AND id != ?',
      [name, school_id, id]
    );
    
    if (existingClass.length > 0) {
      return res.status(400).json({ 
        error: 'A class with this name already exists for the selected school' 
      });
    }
    
    // Update class
    const [result] = await db.promise().query(
      'UPDATE classes SET name = ?, level = ?, school_id = ? WHERE id = ?',
      [name, level, school_id, id]
    );
    
    res.json({
      message: 'Class updated successfully',
      changes: result.affectedRows
    });
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete a class
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verify class exists
    const [classExists] = await db.promise().query(
      'SELECT id FROM classes WHERE id = ?',
      [id]
    );
    
    if (classExists.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Check if the class has exams
    const [exams] = await db.promise().query(
      'SELECT COUNT(*) as count FROM exams WHERE class_id = ?',
      [id]
    );
    
    if (exams[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class that has exams scheduled. Please delete all exams first.' 
      });
    }
    
    // Check if the class has students
    const [students] = await db.promise().query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ?',
      [id]
    );
    
    if (students[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class that has students assigned. Please reassign all students first.' 
      });
    }
    
    // Delete the class
    await db.promise().query('DELETE FROM classes WHERE id = ?', [id]);
    
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error('Error deleting class:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/classes/:id/exams
 * @desc    Get exams for a specific class
 * @access  Private
 */
router.get('/:id/exams', protect, async (req, res) => {
  const { id } = req.params;
  const { category_id } = req.query;
  
  try {
    // Verify class exists
    const [classExists] = await db.promise().query(
      'SELECT id FROM classes WHERE id = ?',
      [id]
    );
    
    if (classExists.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Build query for exams
    let query = `
      SELECT e.*, c.name as category_name
      FROM exams e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.class_id = ?
    `;
    
    const queryParams = [id];
    
    if (category_id) {
      query += ' AND e.category_id = ?';
      queryParams.push(category_id);
    }
    
    query += ' ORDER BY e.date ASC';
    
    // Get exams for this class
    const [exams] = await db.promise().query(query, queryParams);
    
    res.json(exams);
  } catch (err) {
    console.error('Error fetching class exams:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/classes/:id/exams
 * @desc    Add an exam for a class
 * @access  Private (Admin only)
 */
router.post('/:id/exams', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { category_id, name, date, venue } = req.body;
  
  // Validate required fields
  if (!category_id || !name || !date || !venue) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: category_id, name, date, venue' 
    });
  }
  
  // Validate date format (simple validation)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      error: 'Date must be in YYYY-MM-DD format'
    });
  }
  
  try {
    // Verify class exists
    const [classExists] = await db.promise().query(
      'SELECT id FROM classes WHERE id = ?',
      [id]
    );
    
    if (classExists.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Verify category exists
    const [categoryExists] = await db.promise().query(
      'SELECT id FROM categories WHERE id = ?',
      [category_id]
    );
    
    if (categoryExists.length === 0) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    // Check for existing exam with same name and date for this class
    const [existingExam] = await db.promise().query(
      'SELECT id FROM exams WHERE class_id = ? AND name = ? AND date = ?',
      [id, name, date]
    );
    
    if (existingExam.length > 0) {
      return res.status(400).json({ 
        error: 'An exam with this name and date already exists for this class' 
      });
    }
    
    // Create new exam
    const [result] = await db.promise().query(
      'INSERT INTO exams (class_id, category_id, name, date, venue) VALUES (?, ?, ?, ?, ?)',
      [id, category_id, name, date, venue]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'Exam scheduled successfully'
    });
  } catch (err) {
    console.error('Error scheduling exam:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/classes/:id/exams/:examId
 * @desc    Update exam information
 * @access  Private (Admin only)
 */
router.put('/:id/exams/:examId', protect, isAdmin, async (req, res) => {
  const { id, examId } = req.params;
  const { category_id, name, date, venue } = req.body;
  
  // Validate required fields
  if (!category_id || !name || !date || !venue) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: category_id, name, date, venue' 
    });
  }
  
  // Validate date format (simple validation)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      error: 'Date must be in YYYY-MM-DD format'
    });
  }
  
  try {
    // Verify class exists
    const [classExists] = await db.promise().query(
      'SELECT id FROM classes WHERE id = ?',
      [id]
    );
    
    if (classExists.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Verify exam exists and belongs to the class
    const [examExists] = await db.promise().query(
      'SELECT id FROM exams WHERE id = ? AND class_id = ?',
      [examId, id]
    );
    
    if (examExists.length === 0) {
      return res.status(404).json({ error: 'Exam not found or does not belong to this class' });
    }
    
    // Verify category exists
    const [categoryExists] = await db.promise().query(
      'SELECT id FROM categories WHERE id = ?',
      [category_id]
    );
    
    if (categoryExists.length === 0) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    // Check for existing exam with same name and date for this class (excluding this exam)
    const [existingExam] = await db.promise().query(
      'SELECT id FROM exams WHERE class_id = ? AND name = ? AND date = ? AND id != ?',
      [id, name, date, examId]
    );
    
    if (existingExam.length > 0) {
      return res.status(400).json({ 
        error: 'Another exam with this name and date already exists for this class' 
      });
    }
    
    // Update exam
    const [result] = await db.promise().query(
      'UPDATE exams SET category_id = ?, name = ?, date = ?, venue = ? WHERE id = ?',
      [category_id, name, date, venue, examId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    res.json({
      message: 'Exam updated successfully',
      changes: result.affectedRows
    });
  } catch (err) {
    console.error('Error updating exam:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/classes/:id/exams/:examId
 * @desc    Delete an exam
 * @access  Private (Admin only)
 */
router.delete('/:id/exams/:examId', protect, isAdmin, async (req, res) => {
  const { id, examId } = req.params;
  
  try {
    // Verify exam exists and belongs to the class
    const [examExists] = await db.promise().query(
      'SELECT id FROM exams WHERE id = ? AND class_id = ?',
      [examId, id]
    );
    
    if (examExists.length === 0) {
      return res.status(404).json({ error: 'Exam not found or does not belong to this class' });
    }
    
    // Delete the exam
    const [result] = await db.promise().query(
      'DELETE FROM exams WHERE id = ?',
      [examId]
    );
    
    res.json({ message: 'Exam deleted successfully' });
  } catch (err) {
    console.error('Error deleting exam:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
