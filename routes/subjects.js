// routes/subjects.js
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

// Helper function to validate subject code format
const validateSubjectCode = (code) => {
  // Subject code should be 2-10 characters, alphanumeric
  const codeRegex = /^[A-Z0-9]{2,10}$/;
  return codeRegex.test(code);
};

/**
 * @route   GET /api/subjects
 * @desc    Get all subjects with optional filters
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { search, grade_level, teacher_id, academic_year_id } = req.query;
    
    let query = `
      SELECT s.*, 
             (SELECT COUNT(*) FROM teacher_subjects WHERE subject_id = s.id) as teacher_count
      FROM subjects s
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add search filter if provided
    if (search) {
      query += ` AND (s.name LIKE ? OR s.code LIKE ? OR s.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Add grade level filter if provided
    if (grade_level) {
      query += ` AND s.grade_level = ?`;
      queryParams.push(grade_level);
    }
    
    // Add teacher filter if provided
    if (teacher_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM teacher_subjects 
        WHERE subject_id = s.id AND teacher_id = ?
      )`;
      queryParams.push(teacher_id);
    }
    
    // Add academic year filter if provided
    if (academic_year_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM classes c
        JOIN sections sec ON sec.class_id = c.id
        JOIN teacher_subjects ts ON ts.subject_id = s.id
        WHERE c.academic_year_id = ?
      )`;
      queryParams.push(academic_year_id);
    }
    
    query += ` ORDER BY s.grade_level ASC, s.name ASC`;
    
    const [subjects] = await db.promise().query(query, queryParams);
    
    res.json(subjects);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/subjects/:id
 * @desc    Get subject details with teacher assignments
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get subject details
    const [subjectResults] = await db.promise().query(
      'SELECT * FROM subjects WHERE id = ?',
      [id]
    );
    
    if (subjectResults.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    const subject = subjectResults[0];
    
    // Get teachers assigned to this subject
    const [teachers] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.school_id, s.name as school_name
       FROM teacher_subjects ts
       JOIN users u ON ts.teacher_id = u.id
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE ts.subject_id = ?
       ORDER BY u.full_name ASC`,
      [id]
    );
    
    // Get classes where this subject is taught
    const [classes] = await db.promise().query(
      `SELECT DISTINCT c.id, c.name, c.grade_level, ay.name as academic_year_name
       FROM classes c
       JOIN sections sec ON sec.class_id = c.id
       JOIN teacher_subjects ts ON ts.teacher_id = sec.teacher_id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE ts.subject_id = ?
       ORDER BY ay.start_date DESC, c.grade_level ASC`,
      [id]
    );
    
    // Return subject with teachers and classes
    res.json({
      ...subject,
      teachers,
      classes
    });
  } catch (err) {
    console.error('Error fetching subject details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/subjects
 * @desc    Create a new subject
 * @access  Private (Admin only)
 */
router.post('/', protect, isAdmin, async (req, res) => {
  const { name, code, description, grade_level, credits } = req.body;
  
  // Validate required fields
  if (!name || !code) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: name, code' 
    });
  }
  
  // Validate subject code format
  if (!validateSubjectCode(code)) {
    return res.status(400).json({ 
      error: 'Invalid subject code format. Code must be 2-10 alphanumeric characters in uppercase.' 
    });
  }
  
  // Validate credits if provided
  if (credits !== undefined && (isNaN(parseFloat(credits)) || parseFloat(credits) <= 0)) {
    return res.status(400).json({ 
      error: 'Credits must be a positive number' 
    });
  }
  
  // Validate grade level if provided
  if (grade_level !== undefined && (isNaN(parseInt(grade_level)) || parseInt(grade_level) < 1)) {
    return res.status(400).json({ 
      error: 'Grade level must be a positive integer' 
    });
  }
  
  try {
    // Check for duplicate subject code
    const [existingSubject] = await db.promise().query(
      'SELECT id FROM subjects WHERE code = ?',
      [code]
    );
    
    if (existingSubject.length > 0) {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    
    // Create new subject
    const [result] = await db.promise().query(
      'INSERT INTO subjects (name, code, description, grade_level, credits) VALUES (?, ?, ?, ?, ?)',
      [name, code, description || null, grade_level || null, credits || null]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'Subject created successfully'
    });
  } catch (err) {
    console.error('Error creating subject:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/subjects/:id
 * @desc    Update subject information
 * @access  Private (Admin only)
 */
router.put('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, code, description, grade_level, credits } = req.body;
  
  // Validate required fields
  if (!name || !code) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: name, code' 
    });
  }
  
  // Validate subject code format
  if (!validateSubjectCode(code)) {
    return res.status(400).json({ 
      error: 'Invalid subject code format. Code must be 2-10 alphanumeric characters in uppercase.' 
    });
  }
  
  // Validate credits if provided
  if (credits !== undefined && (isNaN(parseFloat(credits)) || parseFloat(credits) <= 0)) {
    return res.status(400).json({ 
      error: 'Credits must be a positive number' 
    });
  }
  
  // Validate grade level if provided
  if (grade_level !== undefined && (isNaN(parseInt(grade_level)) || parseInt(grade_level) < 1)) {
    return res.status(400).json({ 
      error: 'Grade level must be a positive integer' 
    });
  }
  
  try {
    // Check if subject exists
    const [subjectExists] = await db.promise().query(
      'SELECT id FROM subjects WHERE id = ?',
      [id]
    );
    
    if (subjectExists.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Check for duplicate subject code (excluding current subject)
    const [existingSubject] = await db.promise().query(
      'SELECT id FROM subjects WHERE code = ? AND id != ?',
      [code, id]
    );
    
    if (existingSubject.length > 0) {
      return res.status(400).json({ error: 'Subject code already in use by another subject' });
    }
    
    // Update subject
    const [result] = await db.promise().query(
      'UPDATE subjects SET name = ?, code = ?, description = ?, grade_level = ?, credits = ? WHERE id = ?',
      [name, code, description || null, grade_level || null, credits || null, id]
    );
    
    res.json({
      message: 'Subject updated successfully',
      changes: result.affectedRows
    });
  } catch (err) {
    console.error('Error updating subject:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Delete a subject
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    try {
      // Check if subject exists
      const [subjectExists] = await db.promise().query(
        'SELECT id FROM subjects WHERE id = ?',
        [id]
      );
      
      if (subjectExists.length === 0) {
        await db.promise().query('ROLLBACK');
        return res.status(404).json({ error: 'Subject not found' });
      }
      
      // Check if subject is used in any student grades
      const [gradeReferences] = await db.promise().query(
        'SELECT COUNT(*) as count FROM student_grades WHERE subject_id = ?',
        [id]
      );
      
      if (gradeReferences[0].count > 0) {
        await db.promise().query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Cannot delete subject that is referenced in student grades. Please delete associated grades first.' 
        });
      }
      
      // Delete teacher-subject relationships first
      await db.promise().query(
        'DELETE FROM teacher_subjects WHERE subject_id = ?',
        [id]
      );
      
      // Delete the subject
      const [result] = await db.promise().query(
        'DELETE FROM subjects WHERE id = ?',
        [id]
      );
      
      await db.promise().query('COMMIT');
      
      res.json({ message: 'Subject deleted successfully' });
    } catch (err) {
      await db.promise().query('ROLLBACK');
      console.error('Error deleting subject:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error during subject deletion transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/subjects/:id/teachers
 * @desc    Assign teachers to a subject
 * @access  Private (Admin only)
 */
router.post('/:id/teachers', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { teacher_ids } = req.body;
  
  if (!teacher_ids || !Array.isArray(teacher_ids) || teacher_ids.length === 0) {
    return res.status(400).json({ error: 'Please provide at least one teacher ID' });
  }
  
  try {
    // Check if subject exists
    const [subjectExists] = await db.promise().query(
      'SELECT id FROM subjects WHERE id = ?',
      [id]
    );
    
    if (subjectExists.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    try {
      // Verify all teachers exist and have teacher role
      const teacherPlaceholders = teacher_ids.map(() => '?').join(',');
      const [validTeachers] = await db.promise().query(
        `SELECT u.id
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id IN (${teacherPlaceholders}) AND r.name = 'teacher'`,
        teacher_ids
      );
      
      if (validTeachers.length !== teacher_ids.length) {
        await db.promise().query('ROLLBACK');
        return res.status(400).json({ error: 'One or more invalid teacher IDs or users are not teachers' });
      }
      
      // Insert teacher-subject relationships
      const values = teacher_ids.map(teacher_id => [teacher_id, id]);
      
      await db.promise().query(
        'INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES ?',
        [values]
      );
      
      await db.promise().query('COMMIT');
      
      res.status(201).json({
        message: 'Teachers assigned to subject successfully',
        assigned_count: values.length
      });
    } catch (err) {
      await db.promise().query('ROLLBACK');
      console.error('Error assigning teachers to subject:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error during teacher assignment process:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/subjects/:id/teachers
 * @desc    Get teachers assigned to a subject
 * @access  Private
 */
router.get('/:id/teachers', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if subject exists
    const [subjectExists] = await db.promise().query(
      'SELECT id, name, code FROM subjects WHERE id = ?',
      [id]
    );
    
    if (subjectExists.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Get teachers assigned to this subject
    const [teachers] = await db.promise().query(
      `SELECT u.id, u.full

// routes/subjects.js
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
 * @route   GET /api/subjects
 * @desc    Get all subjects
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { search, grade_level, teacher_id } = req.query;
    
    let query = `
      SELECT s.*, 
             (SELECT COUNT(*) FROM teacher_subjects WHERE subject_id = s.id) as teacher_count
      FROM subjects s
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (search) {
      query += ` AND (s.name LIKE ? OR s.code LIKE ? OR s.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (grade_level) {
      query += ` AND s.grade_level = ?`;
      queryParams.push(grade_level);
    }
    
    if (teacher_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM teacher_subjects 
        WHERE subject_id = s.id AND teacher_id = ?
      )`;
      queryParams.push(teacher_id);
    }
    
    query += ` ORDER BY s.name ASC`;
    
    const [subjects] = await db.promise().query(query, queryParams);
    
    res.json(subjects);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/subjects/:id
 * @desc    Get subject details
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get subject details
    const [subjectResults] = await db.promise().query(
      'SELECT * FROM subjects WHERE id = ?',
      [id]
    );
    
    if (subjectResults.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    const subject = subjectResults[0];
    
    // Get teachers assigned to this subject
    const [teachers] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.school_id, s.name as school_name
       FROM teacher_subjects ts
       JOIN users u ON ts.teacher_id = u.id
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE ts.subject_id = ?
       ORDER BY u.full_name ASC`,
      [id]
    );
    
    // Return subject with teachers
    res.json({
      ...subject,
      teachers
    });
  } catch (err) {
    console.error('Error fetching subject details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/subjects
 * @desc    Create a new subject
 * @access  Private (Admin only)
 */
router.post('/', protect, isAdmin, async (req, res) => {
  const { name, code, description, grade_level, credits } = req.body;
  
  // Validate required fields
  if (!name || !code) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: name, code' 
    });
  }
  
  try {
    // Check for duplicate subject code
    const [existingSubject] = await db.promise().query(
      'SELECT id FROM subjects WHERE code = ?',
      [code]
    );
    
    if (existingSubject.length > 0) {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    
    // Create new subject
    const [result] = await db.promise().query(
      'INSERT INTO subjects (name, code, description, grade_level, credits) VALUES (?, ?, ?, ?, ?)',
      [name, code, description || null, grade_level || null, credits || null]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'Subject created successfully'
    });
  } catch (err) {
    console.error('Error creating subject:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/subjects/:id
 * @desc    Update subject information
 * @access  Private (Admin only)
 */
router.put('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, code, description, grade_level, credits } = req.body;
  
  // Validate required fields
  if (!name || !code) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: name, code' 
    });
  }
  
  try {
    // Check if subject exists
    const [subjectExists] = await db.promise().query(
      'SELECT id FROM subjects WHERE id = ?',
      [id]
    );
    
    if (subjectExists.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Check for duplicate subject code (excluding current subject)
    const [existingSubject] = await db.promise().query(
      'SELECT id FROM subjects WHERE code = ? AND id != ?',
      [code, id]
    );
    
    if (existingSubject.length > 0) {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    
    // Update subject
    const [result] = await db.promise().query(
      'UPDATE subjects SET name = ?, code = ?, description = ?, grade_level = ?, credits = ? WHERE id = ?',
      [name, code, description || null, grade_level || null, credits || null, id]
    );
    
    res.json({
      message: 'Subject updated successfully',
      changes: result.affectedRows
    });
  } catch (err) {
    console.error('Error updating subject:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Delete a subject
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    try {
      // Check if subject exists
      const [subjectExists] = await db.promise().query(
        'SELECT id FROM subjects WHERE id = ?',
        [id]
      );
      
      if (subjectExists.length === 0) {
        await db.promise().query('ROLLBACK');
        return res.status(404).json({ error: 'Subject not found' });
      }
      
      // Check if subject is used in any student grades
      const [gradeReferences] = await db.promise().query(
        'SELECT COUNT(*) as count FROM student_grades WHERE subject_id = ?',
        [id]
      );
      
      if (gradeReferences[0].count > 0) {
        await db.promise().query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Cannot delete subject that is referenced in student grades. Please delete associated grades first.' 
        });
      }
      
      // Delete teacher-subject relationships first
      await db.promise().query(
        'DELETE FROM teacher_subjects WHERE subject_id = ?',
        [id]
      );
      
      // Delete the subject
      const [result] = await db.promise().query(
        'DELETE FROM subjects WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        await db.promise().query('ROLLBACK');
        return res.status(404).json({ error: 'Subject not found' });
      }
      
      await db.promise().query('COMMIT');
      
      res.json({ message: 'Subject deleted successfully' });
    } catch (err) {
      await db.promise().query('ROLLBACK');
      console.error('Error deleting subject:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error during subject deletion:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/subjects/:id/teachers
 * @desc    Assign teachers to a subject
 * @access  Private (Admin only)
 */
router.post('/:id/teachers', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { teacher_ids } = req.body;
  
  if (!teacher_ids || !Array.isArray(teacher_ids) || teacher_ids.length === 0) {
    return res.status(400).json({ error: 'Please provide at least one teacher ID' });
  }
  
  try {
    // Check if subject exists
    const [subjectExists] = await db.promise().query(
      'SELECT id FROM subjects WHERE id = ?',
      [id]
    );
    
    if (subjectExists.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Verify all teachers exist and have teacher role
    const placeholders = teacher_ids.map(() => '?').join(',');
    const [validTeachers] = await db.promise().query(
      `SELECT u.id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id IN (${placeholders}) AND r.name = 'teacher'`,
      teacher_ids
    );
    
    if (validTeachers.length !== teacher_ids.length) {
      return res.status(400).json({ error: 'One or more invalid teacher IDs or users are not teachers' });
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    try {
      // Insert teacher-subject relationships
      const values = teacher_ids.map(teacher_id => [teacher_id, id]);
      
      await db.promise().query(
        'INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES ?',
        [values]
      );
      
      await db.promise().query('COMMIT');
      
      res.status(201).json({
        message: 'Teachers assigned to subject successfully',
        assigned_count: values.length
      });
    } catch (err) {
      await db.promise().query('ROLLBACK');
      console.error('Error assigning teachers to subject:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error during teacher assignment process:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/subjects/:id/teachers/:teacherId
 * @desc    Remove a teacher from a subject
 * @access  Private (Admin only)
 */
router.delete('/:id/teachers/:teacherId', protect, isAdmin, async (req, res) => {
  const { id, teacherId } = req.params;
  
  try {
    // Check if the relationship exists
    const [relationship] = await db.promise().query(
      'SELECT * FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?',
      [teacherId, id]
    );
    
    if (relationship.length === 0) {
      return res.status(404).json({ error: 'Teacher is not assigned to this subject' });
    }
    
    // Delete the relationship
    await db.promise().query(
      'DELETE FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?',
      [teacherId, id]
    );
    
    res.json({ message: 'Teacher removed from subject successfully' });
  } catch (err) {
    console.error('Error removing teacher from subject:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
