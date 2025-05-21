// routes/teachers.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { protect } = require('../middlewares/authMiddleware');

// Helper function to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

// Helper function to check if user is either admin or the teacher themselves
const isAdminOrTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role === 'admin' || req.user.id === parseInt(req.params.id)) {
    next();
  } else {
    return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
  }
};

/**
 * @route   GET /api/teachers
 * @desc    Get all teachers with optional filters
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { subject_id, school_id, search } = req.query;
    
    let query = `
      SELECT u.id, u.full_name, u.email, u.school_id, s.name as school_name,
             u.created_at, u.updated_at, 
             (SELECT COUNT(*) FROM sections WHERE teacher_id = u.id) as assigned_sections
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'teacher'
    `;
    
    const queryParams = [];
    
    // Add filters if provided
    if (subject_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM teacher_subjects ts 
        WHERE ts.teacher_id = u.id AND ts.subject_id = ?
      )`;
      queryParams.push(subject_id);
    }
    
    if (school_id) {
      query += ` AND u.school_id = ?`;
      queryParams.push(school_id);
    }
    
    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY u.full_name ASC`;
    
    const [teachers] = await db.promise().query(query, queryParams);
    
    res.json(teachers);
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/teachers/:id
 * @desc    Get teacher details with their assignments
 * @access  Private (Admin or the teacher themselves)
 */
router.get('/:id', protect, isAdminOrTeacher, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get teacher basic info
    const [teacherResults] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.school_id, s.name as school_name,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'teacher'`,
      [id]
    );
    
    if (teacherResults.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    const teacher = teacherResults[0];
    
    // Get teacher's subjects
    const [subjects] = await db.promise().query(
      `SELECT s.id, s.name, s.code
       FROM subjects s
       JOIN teacher_subjects ts ON s.id = ts.subject_id
       WHERE ts.teacher_id = ?
       ORDER BY s.name ASC`,
      [id]
    );
    
    // Get teacher's qualifications
    const [qualifications] = await db.promise().query(
      `SELECT id, degree, institution, year_obtained, description
       FROM teacher_qualifications
       WHERE teacher_id = ?
       ORDER BY year_obtained DESC`,
      [id]
    );
    
    // Get teacher's assignments (sections they teach)
    const [assignments] = await db.promise().query(
      `SELECT s.id, s.name as section_name, c.name as class_name, 
              c.grade_level, ay.name as academic_year
       FROM sections s
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE s.teacher_id = ?
       ORDER BY ay.start_date DESC, c.grade_level ASC, s.name ASC`,
      [id]
    );
    
    // Return teacher with related data
    res.json({
      ...teacher,
      subjects,
      qualifications,
      assignments
    });
  } catch (err) {
    console.error('Error fetching teacher details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/teachers
 * @desc    Create a new teacher (creates a new user with teacher role)
 * @access  Private (Admin only)
 */
router.post('/', protect, isAdmin, async (req, res) => {
  const { full_name, email, password, school_id, subjects = [] } = req.body;
  
  // Validate required fields
  if (!full_name || !email || !password || !school_id) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: full_name, email, password, school_id' 
    });
  }
  
  try {
    // Check if email is already in use
    const [existingUser] = await db.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Verify school exists
    const [schoolExists] = await db.promise().query(
      'SELECT id FROM schools WHERE id = ?',
      [school_id]
    );
    
    if (schoolExists.length === 0) {
      return res.status(400).json({ error: 'Invalid school ID' });
    }
    
    // Get teacher role ID
    const [roleResult] = await db.promise().query(
      'SELECT id FROM roles WHERE name = ?',
      ['teacher']
    );
    
    if (roleResult.length === 0) {
      return res.status(500).json({ error: 'Teacher role not found in system' });
    }
    
    const role_id = roleResult[0].id;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    // Create user with teacher role
    const [createResult] = await db.promise().query(
      'INSERT INTO users (full_name, email, password, role_id, school_id) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, hashedPassword, role_id, school_id]
    );
    
    const teacherId = createResult.insertId;
    
    // Add teacher subjects if provided
    if (subjects.length > 0) {
      // Verify all subjects exist
      const placeholders = subjects.map(() => '?').join(',');
      const [validSubjects] = await db.promise().query(
        `SELECT id FROM subjects WHERE id IN (${placeholders})`,
        subjects
      );
      
      if (validSubjects.length !== subjects.length) {
        await db.promise().query('ROLLBACK');
        return res.status(400).json({ error: 'One or more invalid subject IDs' });
      }
      
      // Insert teacher-subject relationships
      const subjectValues = subjects.map(subject_id => [teacherId, subject_id]);
      await db.promise().query(
        'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ?',
        [subjectValues]
      );
    }
    
    await db.promise().query('COMMIT');
    
    res.status(201).json({
      id: teacherId,
      message: 'Teacher created successfully'
    });
  } catch (err) {
    await db.promise().query('ROLLBACK');
    console.error('Error creating teacher:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/teachers/:id
 * @desc    Update teacher information
 * @access  Private (Admin only)
 */
router.put('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { full_name, email, password, school_id, subjects } = req.body;
  
  try {
    // Check if teacher exists
    const [teacherExists] = await db.promise().query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'teacher'`,
      [id]
    );
    
    if (teacherExists.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Verify school exists if provided
    if (school_id) {
      const [schoolExists] = await db.promise().query(
        'SELECT id FROM schools WHERE id = ?',
        [school_id]
      );
      
      if (schoolExists.length === 0) {
        return res.status(400).json({ error: 'Invalid school ID' });
      }
    }
    
    // Check if email is already in use by another user
    if (email) {
      const [existingUser] = await db.promise().query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (full_name) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }
    
    if (school_id) {
      updateFields.push('school_id = ?');
      updateValues.push(school_id);
    }
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      await db.promise().query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
    
    // Update teacher subjects if provided
    if (subjects && Array.isArray(subjects)) {
      // Verify all subjects exist
      const placeholders = subjects.map(() => '?').join(',');
      const [validSubjects] = await db.promise().query(
        `SELECT id FROM subjects WHERE id IN (${placeholders})`,
        subjects
      );
      
      if (validSubjects.length !== subjects.length) {
        await db.promise().query('ROLLBACK');
        return res.status(400).json({ error: 'One or more invalid subject IDs' });
      }
      
      // Remove existing teacher-subject relationships
      await db.promise().query(
        'DELETE FROM teacher_subjects WHERE teacher_id = ?',
        [id]
      );
      
      // Insert new teacher-subject relationships
      if (subjects.length > 0) {
        const subjectValues = subjects.map(subject_id => [id, subject_id]);
        await db.promise().query(
          'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ?',
          [subjectValues]
        );
      }
    }
    
    await db.promise().query('COMMIT');
    
    res.json({ message: 'Teacher updated successfully' });
  } catch (err) {
    await db.promise().query('ROLLBACK');
    console.error('Error updating teacher:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/teachers/:id
 * @desc    Delete a teacher
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if teacher exists
    const [teacherExists] = await db.promise().query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'teacher'`,
      [id]
    );
    
    if (teacherExists.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Check if teacher is assigned to any sections
    const [assignedSections] = await db.promise().query(
      'SELECT COUNT(*) as count FROM sections WHERE teacher_id = ?',
      [id]
    );
    
    if (assignedSections[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete teacher who is assigned to sections. Please reassign sections first.' 
      });
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    // Delete teacher-subject relationships
    await db.promise().query('DELETE FROM teacher_subjects WHERE teacher_id = ?', [id]);
    
    // Delete teacher qualifications
    await db.promise().query('DELETE FROM teacher_qualifications WHERE teacher_id = ?', [id]);
    
    // Delete the user
    await db.promise().query('DELETE FROM users WHERE id = ?', [id]);
    
    await db.promise().query('COMMIT');
    
    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    await db.promise().query('ROLLBACK');
    console.error('Error deleting teacher:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/teachers/:i

