// routes/students.js
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

// Helper function to check if user is admin, teacher or parent of the student
const isAuthorized = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.params;
  
  // Admin has full access
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Check if user is a teacher assigned to student's class
  if (req.user.role === 'teacher') {
    try {
      const [teacherHasAccess] = await db.promise().query(
        `SELECT 1 FROM student_enrollments se
         JOIN sections s ON se.section_id = s.id
         WHERE se.student_id = ? AND s.teacher_id = ? AND se.is_active = true
         LIMIT 1`,
        [id, req.user.id]
      );
      
      if (teacherHasAccess.length > 0) {
        return next();
      }
    } catch (err) {
      console.error('Error checking teacher access:', err);
    }
  }
  
  // Check if user is parent/guardian of the student
  if (req.user.role === 'parent') {
    try {
      const [parentHasAccess] = await db.promise().query(
        `SELECT 1 FROM guardian_students
         WHERE student_id = ? AND guardian_id = ?
         LIMIT 1`,
        [id, req.user.id]
      );
      
      if (parentHasAccess.length > 0) {
        return next();
      }
    } catch (err) {
      console.error('Error checking parent access:', err);
    }
  }
  
  // Student can access their own record
  if (req.user.role === 'student' && req.user.id === parseInt(id)) {
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Access denied. You do not have permission to access this student record.' 
  });
};

/**
 * @route   GET /api/students
 * @desc    Get all students with optional filters
 * @access  Private (Admin and Teachers)
 */
router.get('/', protect, async (req, res) => {
  try {
    // Extract filter parameters
    const { 
      class_id, 
      section_id, 
      academic_year_id, 
      search,
      school_id,
      status,
      grade_level
    } = req.query;
    
    // Basic authorization (admins see all, teachers see only their students)
    let teacherFilter = '';
    const queryParams = [];
    
    if (req.user.role === 'teacher') {
      teacherFilter = `
        AND EXISTS (
          SELECT 1 FROM sections s
          JOIN student_enrollments se ON s.id = se.section_id
          WHERE s.teacher_id = ? AND se.student_id = u.id AND se.is_active = 1
        )
      `;
      queryParams.push(req.user.id);
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied. Only admins and teachers can view student lists.' 
      });
    }
    
    // Start building the query
    let query = `
      SELECT u.id, u.full_name, u.email, u.school_id, s.name as school_name,
             sp.admission_number, sp.date_of_birth, sp.gender, sp.address, sp.phone_number,
             (SELECT COUNT(*) FROM student_enrollments se WHERE se.student_id = u.id AND se.is_active = 1) as active_enrollments,
             CASE WHEN EXISTS (
               SELECT 1 FROM student_enrollments se 
               WHERE se.student_id = u.id AND se.is_active = 1
             ) THEN 'enrolled' ELSE 'not_enrolled' END as enrollment_status
      FROM users u
      JOIN student_profiles sp ON u.id = sp.student_id
      LEFT JOIN schools s ON u.school_id = s.id
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'student'
      ${teacherFilter}
    `;
    
    // Add filters if provided
    if (class_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM student_enrollments se 
        JOIN sections sec ON se.section_id = sec.id 
        WHERE se.student_id = u.id AND sec.class_id = ? AND se.is_active = 1
      )`;
      queryParams.push(class_id);
    }
    
    if (section_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM student_enrollments se 
        WHERE se.student_id = u.id AND se.section_id = ? AND se.is_active = 1
      )`;
      queryParams.push(section_id);
    }
    
    if (academic_year_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM student_enrollments se 
        JOIN sections sec ON se.section_id = sec.id
        JOIN classes c ON sec.class_id = c.id
        WHERE se.student_id = u.id AND c.academic_year_id = ? AND se.is_active = 1
      )`;
      queryParams.push(academic_year_id);
    }
    
    if (school_id) {
      query += ` AND u.school_id = ?`;
      queryParams.push(school_id);
    }
    
    if (grade_level) {
      query += ` AND EXISTS (
        SELECT 1 FROM student_enrollments se 
        JOIN sections sec ON se.section_id = sec.id
        JOIN classes c ON sec.class_id = c.id
        WHERE se.student_id = u.id AND c.grade_level = ? AND se.is_active = 1
      )`;
      queryParams.push(grade_level);
    }
    
    if (status === 'enrolled') {
      query += ` AND EXISTS (
        SELECT 1 FROM student_enrollments se 
        WHERE se.student_id = u.id AND se.is_active = 1
      )`;
    } else if (status === 'not_enrolled') {
      query += ` AND NOT EXISTS (
        SELECT 1 FROM student_enrollments se 
        WHERE se.student_id = u.id AND se.is_active = 1
      )`;
    }
    
    if (search) {
      query += ` AND (
        u.full_name LIKE ? OR 
        u.email LIKE ? OR 
        sp.admission_number LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ` ORDER BY u.full_name ASC`;
    
    const [students] = await db.promise().query(query, queryParams);
    
    res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/students/:id
 * @desc    Get detailed student information
 * @access  Private (Admin, Teachers of student's class, Parents of student, Student themselves)
 */
router.get('/:id', protect, isAuthorized, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get student basic info
    const [studentResults] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, u.school_id, s.name as school_name,
              u.created_at, u.updated_at,
              sp.admission_number, sp.date_of_birth, sp.gender, sp.address, 
              sp.phone_number, sp.blood_group, sp.medical_conditions, sp.emergency_contact
       FROM users u
       JOIN student_profiles sp ON u.id = sp.student_id
       LEFT JOIN schools s ON u.school_id = s.id
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'student'`,
      [id]
    );
    
    if (studentResults.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResults[0];
    
    // Get guardians/parents
    const [guardians] = await db.promise().query(
      `SELECT u.id, u.full_name, u.email, gs.relationship, 
              gs.is_primary_contact, gs.contact_priority
       FROM guardian_students gs
       JOIN users u ON gs.guardian_id = u.id
       WHERE gs.student_id = ?
       ORDER BY gs.contact_priority ASC`,
      [id]
    );
    
    // Get current enrollments
    const [currentEnrollments] = await db.promise().query(
      `SELECT se.id, se.enrollment_date, se.section_id, se.roll_number,
              s.name as section_name, c.id as class_id, c.name as class_name,
              c.grade_level, ay.id as academic_year_id, ay.name as academic_year_name
       FROM student_enrollments se
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE se.student_id = ? AND se.is_active = 1
       ORDER BY se.enrollment_date DESC`,
      [id]
    );
    
    // Return student with related data
    res.json({
      ...student,
      guardians,
      current_enrollments: currentEnrollments
    });
  } catch (err) {
    console.error('Error fetching student details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/students
 * @desc    Register a new student
 * @access  Private (Admin only)
 */
router.post('/', protect, isAdmin, async (req, res) => {
  const { 
    full_name, 
    email, 
    password, 
    school_id, 
    admission_number,
    date_of_birth,
    gender,
    address,
    phone_number,
    blood_group,
    medical_conditions,
    emergency_contact,
    guardians = []
  } = req.body;
  
  // Validate required fields
  if (!full_name || !email || !password || !school_id || !admission_number || !date_of_birth || !gender) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: full_name, email, password, school_id, admission_number, date_of_birth, gender' 
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
    
    // Check if admission number is already in use
    const [existingAdmission] = await db.promise().query(
      'SELECT student_id FROM student_profiles WHERE admission_number = ?',
      [admission_number]
    );
    
    if (existingAdmission.length > 0) {
      return res.status(400).json({ error: 'Admission number already in use' });
    }
    
    // Verify school exists
    const [schoolExists] = await db.promise().query(
      'SELECT id FROM schools WHERE id = ?',
      [school_id]
    );
    
    if (schoolExists.length === 0) {
      return res.status(400).json({ error: 'Invalid school ID' });
    }
    
    // Get student role ID
    const [roleResult] = await db.promise().query(
      'SELECT id FROM roles WHERE name = ?',
      ['student']
    );
    
    if (roleResult.length === 0) {
      return res.status(500).json({ error: 'Student role not found in system' });
    }
    
    const role_id = roleResult[0].id;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    // Create user with student role
    const [createResult] = await db.promise().query(
      'INSERT INTO users (full_name, email, password, role_id, school_id) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, hashedPassword, role_id, school_id]
    );
    
    const studentId = createResult.insertId;
    
    // Create student profile
    await db.promise().query(
      `INSERT INTO student_profiles 
       (student_id, admission_number, date_of_birth, gender, address, phone_number, blood_group, medical_conditions, emergency_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId, 
        admission_number, 
        date_of_birth, 
        gender, 
        address || null, 
        phone_number || null, 
        blood_group || null, 
        medical_conditions || null, 
        emergency_contact || null
      ]
    );
    
    // Add guardian relationships if provided
    if (guardians.length > 0) {
      for (const guardian of guardians) {
        // Verify guardian exists and has parent role
        const [guardianExists] = await db.promise().query(
          `SELECT u.id FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE u.id = ? AND r.name = 'parent'`,
          [guardian.guardian_id]
        );
        
        if (guardianExists.length === 0) {
          await db.promise().query('ROLLBACK');
          return res.status(400).json({ error: `Guardian with ID ${guardian.guardian_id} not found or is not a parent` });
        }
        
        // Add guardian-student relationship
        await db.promise().query(
          `INSERT INTO guardian_students 
           (guardian_id, student_id, relationship, is_primary_contact, contact_priority)
           VALUES (?, ?, ?, ?, ?)`,
          [
            guardian.guardian_id,
            studentId,
            guardian.relationship || 'Guardian',
            guardian.is_primary_contact || false,
            guardian.contact_priority || 1
          ]
        );
      }
    }
    
    await db.promise().query('COMMIT');
    
    res.status(201).json({
      id: studentId,
      message: 'Student registered successfully'
    });
  } catch (err) {
    await db.promise().query('ROLLBACK');
    console.error('Error registering student:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/students/:id
 * @desc    Update student information
 * @access  Private (Admin only)
 */
router.put('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { 
    full_name, 
    email, 
    password, 
    school_id, 
    admission_number,
    date_of_birth,
    gender,
    address,
    phone_number,
    blood_group,
    medical_conditions,
    emergency_contact,
    guardians
  } = req.body;
  
  try {
    // Check if student exists
    const [studentExists] = await db.promise().query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'student'`,
      [id]
    );
    
    if (studentExists.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    // Update user record if applicable fields are provided
    const userUpdateFields = [];
    const userUpdateValues = [];
    
    if (full_name) {
      userUpdateFields.push('full_name = ?');
      userUpdateValues.push(full_name);
    }
    
    if (email) {
      // Check if email is already used by another user
      const [existingUser] = await db.promise().query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existingUser.length > 0) {
        await db.promise().query('ROLLBACK');
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
      
      userUpdateFields.push('email = ?');
      userUpdateValues.push(email);
    }
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      userUpdateFields.push('password = ?');
      userUpdateValues.push(hashedPassword);
    }
    
    if (school_id) {
      // Verify school exists
      const [schoolExists] = await db.promise().query(
        'SELECT id FROM schools WHERE id = ?',
        [school_id]
      );
      
      if (schoolExists.length === 0) {
        await db.promise().query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid school ID' });
      }
      
      userUpdateFields.push('school_id = ?');
      userUpdateValues.push(school_id);
    }
    
    if (userUpdateFields.length > 0) {
      userUpdateValues.push(id);
      await db.promise().query(
        `UPDATE users SET ${userUpdateFields.join(', ')} WHERE id = ?`,
        userUpdateValues
      );
    }
    
    // Update student profile if applicable fields are provided
    const profileUpdateFields = [];
    const profileUpdateValues = [];
    
    if (admission_number) {
      // Check if admission number is already used by another student
      const [existingAdmission] = await db.promise().query(
        'SELECT student_id FROM student_profiles WHERE admission_number = ? AND student_id != ?',
        [admission_number, id]
      );
      
      if (existingAdmission.length > 0) {
        await db.promise().query('ROLLBACK');
        return res.status(400).json({ error: 'Admission number already in use by another student' });
      }
      
      profileUpdateFields.push('admission_number = ?');
      profileUpdateValues.push(admission_number);
    }
    
    if (date_of_birth) {
      profileUpdateFields.push('date_of_birth = ?');
      profileUpdateValues.push(date_of_birth);
    }
    
    if (gender) {
      profileUpdateFields.push('gender = ?');
      profileUpdateValues.push(gender);
    }
    
    if (address !== undefined) {
      profileUpdateFields.push('address = ?');
      profileUpdateValues.push(address);
    }
    
    if (phone_number !== undefined) {
      profileUpdateFields.push('phone_number = ?');
      profileUpdateValues.push(phone_number);
    }
    
    if (blood_group !== undefined) {
      profileUpdateFields.push('blood_group = ?');
      profileUpdateValues.push(blood_group);
    }
    
    if (medical_conditions !== undefined) {
      profileUpdateFields.push('medical_conditions = ?');
      profileUpdateValues.push(medical_conditions);
    }
    
    if (emergency_contact !== undefined) {
      profileUpdateFields.push('emergency_contact = ?');
      profileUpdateValues.push(emergency_contact);
    }
    
    if (profileUpdateFields.length > 0) {
      profileUpdateValues.push(id);
      await db.promise().query(
        `UPDATE student_profiles SET ${profileUpdateFields.join(', ')} WHERE student_id = ?`,
        profileUpdateValues
      );
    }
    
    // Update guardians if provided
    if (guardians && Array.isArray(guardians)) {
      // Remove existing guardian relationships
      await db.promise().query(
        'DELETE FROM guardian_students WHERE student_id = ?',
        [id]
      );
      
      // Add new guardian relationships
      for (const guardian of guardians) {
        if (!guardian.guardian_id) {
          continue;
        }
        
        // Verify guardian exists and has parent role
        const [guardianExists] = await db.promise().query(
          `SELECT u.id FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE u.id = ? AND r.name = 'parent'`,
          [guardian.guardian_id]
        );
        
        if (guardianExists.length === 0) {
          await db.promise().query('ROLLBACK');
          return res.status(400).json({ error: `Guardian with ID ${guardian.guardian_id} not found or is not a parent` });
        }
        
        // Add guardian-student relationship
        await db.promise().query(
          `INSERT INTO guardian_students 
           (guardian_id, student_id, relationship, is_primary_contact, contact_priority)
           VALUES (?, ?, ?, ?, ?)`,
          [
            guardian.guardian_id,
            id,
            guardian.relationship || 'Guardian',
            guardian.is_primary_contact || false,
            guardian.contact_priority || 1
          ]
        );
      }
    }
    
    await db.promise().query('COMMIT');
    
    res.json({ message: 'Student information updated successfully' });
  } catch (err) {
    await db.promise().query('ROLLBACK');
    console.error('Error updating student:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete a student
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if student exists
    const [studentExists] = await db.promise().query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'student'`,
      [id]
    );
    
    if (studentExists.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    // Check for active enrollments
    const [activeEnrollments] = await db.promise().query(
      'SELECT COUNT(*) as count FROM student_enrollments WHERE student_id = ? AND is_active = 1',
      [id]
    );
    
    if (activeEnrollments[0].count > 0) {
      await db.promise().query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot delete student with active enrollments. Please deactivate all enrollments first.' 
      });
    }
    
    // Delete guardian-student relationships
    await db.promise().query('DELETE FROM guardian_students WHERE student_id = ?', [id]);
    
    // Delete student enrollments (historical records)
    await db.promise().query('DELETE FROM student_enrollments WHERE student_id = ?', [id]);
    
    // Delete student profile
    await db.promise().query('DELETE FROM student_profiles WHERE student_id = ?', [id]);
    
    // Delete user
    await db.promise().query('DELETE FROM users WHERE id = ?', [id]);
    
    await db.promise().query('COMMIT');
    
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    await db.promise().query('ROLLBACK');
    console.error('Error deleting student:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/students/:id/enroll
 * @desc    Enroll student in a class/section
 * @access  Private (Admin only)
 */
router.post('/:id/enroll', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { section_id, roll_number } = req.body;
  
  // Validate required fields
  if (!section_id) {
    return res.status(400).json({ error: 'Section ID is required' });
  }
  
  try {
    // Check if student exists
    const [studentExists] = await db.promise().query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'student'`,
      [id]
    );
    
    if (studentExists.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Verify section exists
    const [sectionResults] = await db.promise().query(
      `SELECT s.id, s.class_id, s.capacity, c.academic_year_id,
              (SELECT COUNT(*) FROM student_enrollments WHERE section_id = s.id AND is_active = 1) as current_students
       FROM sections s
       JOIN classes c ON s.class_id = c.id
       WHERE s.id = ?`,
      [section_id]
    );
    
    if (sectionResults.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    const section = sectionResults[0];
    
    // Check if section is at capacity
    if (section.current_students >= section.capacity) {
      return res.status(400).json({ error: 'Section is at full capacity. Cannot enroll more students.' });
    }
    
    // Check if student is already enrolled in any section for this academic year
    const [existingEnrollment] = await db.promise().query(
      `SELECT se.id, s.name as section_name, c.name as class_name
       FROM student_enrollments se
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       WHERE se.student_id = ? 
       AND c.academic_year_id = ? 
       AND se.is_active = 1`,
      [id, section.academic_year_id]
    );
    
    if (existingEnrollment.length > 0) {
      return res.status(400).json({ 
        error: `Student is already enrolled in ${existingEnrollment[0].class_name} (${existingEnrollment[0].section_name}) for this academic year. Use transfer endpoint to change sections.`,
        enrollment_id: existingEnrollment[0].id 
      });
    }
    
    // Check if roll number is already used in this section
    if (roll_number) {
      const [existingRollNumber] = await db.promise().query(
        'SELECT student_id FROM student_enrollments WHERE section_id = ? AND roll_number = ? AND is_active = 1',
        [section_id, roll_number]
      );
      
      if (existingRollNumber.length > 0) {
        return res.status(400).json({ error: 'Roll number already assigned to another student in this section' });
      }
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    try {
      // Create enrollment
      const enrollmentDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
      
      const [result] = await db.promise().query(
        'INSERT INTO student_enrollments (student_id, section_id, enrollment_date, roll_number, is_active) VALUES (?, ?, ?, ?, 1)',
        [id, section_id, enrollmentDate, roll_number || null]
      );
      
      await db.promise().query('COMMIT');
      
      res.status(201).json({
        id: result.insertId,
        message: 'Student enrolled successfully',
        enrollment_date: enrollmentDate
      });
    } catch (err) {
      await db.promise().query('ROLLBACK');
      console.error('Error enrolling student:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error during enrollment process:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/students/:id/transfer
 * @desc    Transfer student to a different section
 * @access  Private (Admin only)
 */
router.put('/:id/transfer', protect, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { from_section_id, to_section_id, roll_number, transfer_reason } = req.body;
  
  // Validate required fields
  if (!from_section_id || !to_section_id) {
    return res.status(400).json({ error: 'Both source and target section IDs are required' });
  }
  
  if (from_section_id === to_section_id) {
    return res.status(400).json({ error: 'Source and target sections cannot be the same' });
  }
  
  try {
    // Check if student exists
    const [studentExists] = await db.promise().query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'student'`,
      [id]
    );
    
    if (studentExists.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Verify current enrollment exists
    const [currentEnrollment] = await db.promise().query(
      `SELECT se.id, se.roll_number, s.class_id, c.academic_year_id
       FROM student_enrollments se
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       WHERE se.student_id = ? AND se.section_id = ? AND se.is_active = 1`,
      [id, from_section_id]
    );
    
    if (currentEnrollment.length === 0) {
      return res.status(404).json({ error: 'Student is not currently enrolled in the specified source section' });
    }
    
    // Verify target section exists
    const [targetSectionResults] = await db.promise().query(
      `SELECT s.id, s.class_id, s.capacity, c.academic_year_id,
              (SELECT COUNT(*) FROM student_enrollments WHERE section_id = s.id AND is_active = 1) as current_students
       FROM sections s
       JOIN classes c ON s.class_id = c.id
       WHERE s.id = ?`,
      [to_section_id]
    );
    
    if (targetSectionResults.length === 0) {
      return res.status(404).json({ error: 'Target section not found' });
    }
    
    const targetSection = targetSectionResults[0];
    
    // Check if target section is at capacity
    if (targetSection.current_students >= targetSection.capacity) {
      return res.status(400).json({ error: 'Target section is at full capacity. Cannot transfer student.' });
    }
    
    // Verify academic years match (can only transfer within same academic year)
    if (targetSection.academic_year_id !== currentEnrollment[0].academic_year_id) {
      return res.status(400).json({ 
        error: 'Cannot transfer between different academic years. Use the enroll endpoint for a new academic year enrollment.' 
      });
    }
    
    // Check if roll number is already used in target section
    if (roll_number) {
      const [existingRollNumber] = await db.promise().query(
        'SELECT student_id FROM student_enrollments WHERE section_id = ? AND roll_number = ? AND is_active = 1 AND student_id != ?',
        [to_section_id, roll_number, id]
      );
      
      if (existingRollNumber.length > 0) {
        return res.status(400).json({ error: 'Roll number already assigned to another student in the target section' });
      }
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    try {
      const transferDate = new Date().toISOString().split('T')[0]; // Current date
      
      // Deactivate current enrollment
      await db.promise().query(
        `UPDATE student_enrollments 
         SET is_active = 0, 
             end_date = ?, 
             transfer_notes = ?
         WHERE id = ?`,
        [transferDate, transfer_reason || 'Section transfer', currentEnrollment[0].id]
      );
      
      // Create new enrollment in target section
      const [result] = await db.promise().query(
        `INSERT INTO student_enrollments 
         (student_id, section_id, enrollment_date, roll_number, is_active, transfer_from_enrollment_id) 
         VALUES (?, ?, ?, ?, 1, ?)`,
        [
          id, 
          to_section_id, 
          transferDate, 
          roll_number || currentEnrollment[0].roll_number || null,
          currentEnrollment[0].id
        ]
      );
      
      await db.promise().query('COMMIT');
      
      res.status(200).json({
        id: result.insertId,
        message: 'Student transferred successfully',
        transfer_date: transferDate,
        previous_enrollment_id: currentEnrollment[0].id
      });
    } catch (err) {
      await db.promise().query('ROLLBACK');
      console.error('Error transferring student:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error during transfer process:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/students/:id/academic-history
 * @desc    Get student's academic history
 * @access  Private (Authorized users: Admin, Teacher, Parent, Student themselves)
 */
router.get('/:id/academic-history', protect, isAuthorized, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if student exists
    const [studentExists] = await db.promise().query(
      `SELECT u.id, u.full_name 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'student'`,
      [id]
    );
    
    if (studentExists.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get all enrollments (active and inactive) with academic years
    const [enrollments] = await db.promise().query(
      `SELECT 
        se.id AS enrollment_id,
        se.enrollment_date,
        se.end_date,
        se.is_active,
        se.roll_number,
        se.transfer_notes,
        se.transfer_from_enrollment_id,
        s.id AS section_id,
        s.name AS section_name,
        c.id AS class_id,
        c.name AS class_name,
        c.grade_level,
        ay.id AS academic_year_id,
        ay.name AS academic_year_name,
        ay.start_date AS academic_year_start,
        ay.end_date AS academic_year_end,
        CONCAT(u.full_name) AS teacher_name
       FROM student_enrollments se
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       LEFT JOIN users u ON s.teacher_id = u.id
       WHERE se.student_id = ?
       ORDER BY ay.start_date DESC, se.enrollment_date DESC`,
      [id]
    );
    
    // Get student grades/results if available
    const [grades] = await db.promise().query(
      `SELECT 
        g.id,
        g.enrollment_id,
        g.subject_id,
        g.term,
        g.grade_value,
        g.remarks,
        g.graded_date,
        s.name AS subject_name,
        s.code AS subject_code,
        CONCAT(u.full_name) AS graded_by
       FROM student_grades g
       JOIN subjects s ON g.subject_id = s.id
       JOIN users u ON g.graded_by = u.id
       WHERE g.enrollment_id IN (
         SELECT id FROM student_enrollments WHERE student_id = ?
       )
       ORDER BY g.graded_date DESC`,
      [id]
    );
    
    // Get attendance records
    const [attendance] = await db.promise().query(
      `SELECT 
        a.id,
        a.enrollment_id,
        a.date,
        a.status,
        a.reason,
        c.name AS class_name,
        ay.name AS academic_year_name
       FROM student_attendance a
       JOIN student_enrollments se ON a.enrollment_id = se.id
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE se.student_id = ?
       ORDER BY a.date DESC
       LIMIT 100`, // Limit to recent 100 attendance records
      [id]
    );
    
    // Organize enrollments by academic year
    const academicHistory = [];
    const academicYears = {};
    
    enrollments.forEach(enrollment => {
      if (!academicYears[enrollment.academic_year_id]) {
        academicYears[enrollment.academic_year_id] = {
          id: enrollment.academic_year_id,
          name: enrollment.academic_year_name,
          start_date: enrollment.academic_year_start,
          end_date: enrollment.academic_year_end,
          enrollments: [],
          grades: {},
          attendance: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          }
        };
        academicYears[enrollment.academic_year_id].enrollments = [];
        academicHistory.push(academicYears[enrollment.academic_year_id]);
      }
      
      // Add enrollment to appropriate academic year
      academicYears[enrollment.academic_year_id].enrollments.push({
        id: enrollment.enrollment_id,
        enrollment_date: enrollment.enrollment_date,
        end_date: enrollment.end_date,
        is_active: enrollment.is_active === 1,
        roll_number: enrollment.roll_number,
        transfer_notes: enrollment.transfer_notes,
        transfer_from_enrollment_id: enrollment.transfer_from_enrollment_id,
        section: {
          id: enrollment.section_id,
          name: enrollment.section_name,
          teacher_name: enrollment.teacher_name
        },
        class: {
          id: enrollment.class_id,
          name: enrollment.class_name,
          grade_level: enrollment.grade_level
        }
      });
    });
    
    // Add grades to appropriate academic years and enrollments
    grades.forEach(grade => {
      // Find enrollment that grade belongs to
      const enrollmentMatch = enrollments.find(e => e.enrollment_id === grade.enrollment_id);
      
      if (!enrollmentMatch) return; // Skip if enrollment not found
      
      const academicYearId = enrollmentMatch.academic_year_id;
      
      // Initialize subject grades if not exist
      if (!academicYears[academicYearId].grades[grade.subject_id]) {
        academicYears[academicYearId].grades[grade.subject_id] = {
          subject_id: grade.subject_id,
          subject_name: grade.subject_name,
          subject_code: grade.subject_code,
          terms: {}
        };
      }
      
      // Add grade to appropriate term
      if (!academicYears[academicYearId].grades[grade.subject_id].terms[grade.term]) {
        academicYears[academicYearId].grades[grade.subject_id].terms[grade.term] = [];
      }
      
      academicYears[academicYearId].grades[grade.subject_id].terms[grade.term].push({
        id: grade.id,
        enrollment_id: grade.enrollment_id,
        grade_value: grade.grade_value,
        remarks: grade.remarks,
        graded_date: grade.graded_date,
        graded_by: grade.graded_by
      });
    });
    
    // Add attendance records and calculate summaries
    attendance.forEach(record => {
      // Find enrollment that attendance record belongs to
      const enrollmentMatch = enrollments.find(e => e.enrollment_id === record.enrollment_id);
      
      if (!enrollmentMatch) return; // Skip if enrollment not found
      
      const academicYearId = enrollmentMatch.academic_year_id;
      const year = academicYears[academicYearId];
      
      // Update attendance summary
      year.attendance.total++;
      
      switch (record.status.toLowerCase()) {
        case 'present':
          year.attendance.present++;
          break;
        case 'absent':
          year.attendance.absent++;
          break;
        case 'late':
          year.attendance.late++;
          break;
        case 'excused':
          year.attendance.excused++;
          break;
      }
    });
    
    // Convert grades objects to arrays for cleaner JSON response
    academicHistory.forEach(year => {
      const gradesArray = Object.values(year.grades);
      year.grades = gradesArray;
      
      // Sort enrollments by date (latest first)
      year.enrollments.sort((a, b) => new Date(b.enrollment_date) - new Date(a.enrollment_date));
      
      // Calculate attendance percentages
      if (year.attendance.total > 0) {
        year.attendance.present_percentage = Math.round((year.attendance.present / year.attendance.total) * 100);
        year.attendance.absent_percentage = Math.round((year.attendance.absent / year.attendance.total) * 100);
      }
    });
    
    // Build transfer history from enrollments
    const transferHistory = [];
    
    enrollments.forEach(enrollment => {
      if (enrollment.transfer_from_enrollment_id) {
        const sourceEnrollment = enrollments.find(e => e.enrollment_id === enrollment.transfer_from_enrollment_id);
        
        if (sourceEnrollment) {
          transferHistory.push({
            date: enrollment.enrollment_date,
            from: {
              section_name: sourceEnrollment.section_name,
              class_name: sourceEnrollment.class_name,
              grade_level: sourceEnrollment.grade_level
            },
            to: {
              section_name: enrollment.section_name,
              class_name: enrollment.class_name,
              grade_level: enrollment.grade_level
            },
            reason: enrollment.transfer_notes || 'Section transfer'
          });
        }
      }
    });
    
    res.json({
      student_id: id,
      student_name: studentExists[0].full_name,
      academic_history: academicHistory,
      transfer_history: transferHistory,
      recent_attendance: attendance.slice(0, 20) // Include most recent 20 attendance records
    });
  } catch (err) {
    console.error('Error fetching student academic history:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
