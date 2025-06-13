// routes/attendance.js
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

// Helper function to validate date format (YYYY-MM-DD)
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && 
         date.toISOString().slice(0, 10) === dateString;
};

// Helper function to validate attendance status
const isValidStatus = (status) => {
  const validStatuses = ['present', 'absent', 'late', 'excused'];
  return validStatuses.includes(status.toLowerCase());
};

// Helper function to check if user can manage attendance for a section
const canManageSectionAttendance = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Admin has full access
  if (req.user.role === 'admin') {
    return next();
  }
  
  const { sectionId } = req.params;
  
  // Only teachers can manage attendance
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ 
      error: 'Only teachers and admins can manage attendance' 
    });
  }
  
  try {
    // Check if teacher is assigned to this section
    const [teacherAssigned] = await db.query(
      'SELECT id FROM sections WHERE id = ? AND teacher_id = ?',
      [sectionId, req.user.id]
    );
    
    if (teacherAssigned.length > 0) {
      return next();
    }
    
    // Check if teacher teaches any subject to this section
    const [teachesSubject] = await db.query(
      `SELECT 1 FROM teacher_subjects ts
       JOIN sections s ON s.id = ?
       JOIN classes c ON s.class_id = c.id
       WHERE ts.teacher_id = ?
       LIMIT 1`,
      [sectionId, req.user.id]
    );
    
    if (teachesSubject.length > 0) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'You are not authorized to manage attendance for this section' 
    });
  } catch (err) {
    console.error('Error checking attendance management authorization:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Helper function to check if user can view student attendance
const canViewStudentAttendance = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Admin has full access
  if (req.user.role === 'admin') {
    return next();
  }
  
  const { enrollmentId } = req.params;
  
  try {
    // Get student ID from enrollment
    const [enrollment] = await db.query(
      `SELECT se.student_id, se.section_id, s.teacher_id
       FROM student_enrollments se
       JOIN sections s ON se.section_id = s.id
       WHERE se.id = ?`,
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    const studentId = enrollment[0].student_id;
    const sectionId = enrollment[0].section_id;
    const teacherId = enrollment[0].teacher_id;
    
    // Teacher check - can view if assigned to section or teaching a subject
    if (req.user.role === 'teacher') {
      if (req.user.id === teacherId) {
        return next();
      }
      
      // Check if teacher teaches any subject to this section
      const [teachesSubject] = await db.query(
        `SELECT 1 FROM teacher_subjects ts
         JOIN sections s ON s.id = ?
         JOIN classes c ON s.class_id = c.id
         WHERE ts.teacher_id = ?
         LIMIT 1`,
        [sectionId, req.user.id]
      );
      
      if (teachesSubject.length > 0) {
        return next();
      }
      
      return res.status(403).json({ 
        error: 'You are not authorized to view attendance for this student' 
      });
    }
    
    // Student check - can only view their own attendance
    if (req.user.role === 'student') {
      if (req.user.id === studentId) {
        return next();
      }
      
      return res.status(403).json({ 
        error: 'You can only view your own attendance records' 
      });
    }
    
    // Parent check - can only view their children's attendance
    if (req.user.role === 'parent') {
      const [isParent] = await db.query(
        'SELECT 1 FROM guardian_students WHERE guardian_id = ? AND student_id = ? LIMIT 1',
        [req.user.id, studentId]
      );
      
      if (isParent.length > 0) {
        return next();
      }
      
      return res.status(403).json({ 
        error: 'You can only view attendance records for your own children' 
      });
    }
    
    // Reject all other roles
    return res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('Error checking attendance view authorization:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * @route   POST /api/attendance/:sectionId/attendance
 * @desc    Record attendance for multiple students in a section
 * @access  Private (Teachers assigned to section, Admins)
 */
router.post('/:sectionId/attendance', protect, canManageSectionAttendance, async (req, res) => {
  const { sectionId } = req.params;
  const { date, records } = req.body;
  
  // Validate required fields
  if (!date || !records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ 
      error: 'Please provide a valid date and attendance records array' 
    });
  }
  
  // Validate date
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD format.' });
  }
  
  // Prevent future attendance
  const currentDate = new Date();
  const attendanceDate = new Date(date);
  if (attendanceDate > currentDate) {
    return res.status(400).json({ error: 'Cannot record attendance for future dates' });
  }
  
  try {
    // Verify section exists
    const [sectionExists] = await db.query(
      'SELECT id, name FROM sections WHERE id = ?',
      [sectionId]
    );
    
    if (sectionExists.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // Get students enrolled in this section
    const [enrollments] = await db.query(
      `SELECT se.id, se.student_id, u.full_name
       FROM student_enrollments se
       JOIN users u ON se.student_id = u.id
       WHERE se.section_id = ? AND se.is_active = 1`,
      [sectionId]
    );
    
    if (enrollments.length === 0) {
      return res.status(400).json({ error: 'No active students enrolled in this section' });
    }
    
    // Create a map of enrollment IDs for validation
    const enrollmentMap = new Map();
    enrollments.forEach(e => enrollmentMap.set(e.id, e));
    
    // Validate all records
    const invalidRecords = [];
    const validRecords = [];
    
    records.forEach(record => {
      // Validate enrollment ID
      if (!enrollmentMap.has(record.enrollment_id)) {
        invalidRecords.push({
          enrollment_id: record.enrollment_id,
          reason: 'Invalid enrollment ID'
        });
        return;
      }
      
      // Validate status
      if (!record.status || !isValidStatus(record.status)) {
        invalidRecords.push({
          enrollment_id: record.enrollment_id,
          reason: 'Invalid status. Must be one of: present, absent, late, excused'
        });
        return;
      }
      
      validRecords.push({
        enrollment_id: record.enrollment_id,
        status: record.status.toLowerCase(),
        reason: record.reason || null,
        student_name: enrollmentMap.get(record.enrollment_id).full_name
      });
    });
    
    if (invalidRecords.length > 0) {
      return res.status(400).json({ 
        error: 'One or more invalid attendance records',
        invalid_records: invalidRecords
      });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Check for existing attendance records for this date and section
      const [existingRecords] = await db.query(
        `SELECT sa.id, sa.enrollment_id
         FROM student_attendance sa
         JOIN student_enrollments se ON sa.enrollment_id = se.id
         WHERE se.section_id = ? AND sa.date = ?`,
        [sectionId, date]
      );
      
      // Create a map of existing records for easy lookup
      const existingRecordMap = new Map();
      existingRecords.forEach(record => {
        existingRecordMap.set(record.enrollment_id, record.id);
      });
      
      // Prepare records for update or insert
      const recordsToUpdate = [];
      const recordsToInsert = [];
      
      validRecords.forEach(record => {
        if (existingRecordMap.has(record.enrollment_id)) {
          recordsToUpdate.push({
            id: existingRecordMap.get(record.enrollment_id),
            status: record.status,
            reason: record.reason,
            last_modified: new Date().toISOString().split('T')[0],
            modified_by: req.user.id
          });
        } else {
          recordsToInsert.push([
            record.enrollment_id,
            date,
            record.status,
            record.reason,
            req.user.id
          ]);
        }
      });
      
      // Update existing records
      for (const record of recordsToUpdate) {
        await db.query(
          `UPDATE student_attendance 
           SET status = ?, reason = ?, last_modified = ?, modified_by = ?
           WHERE id = ?`,
          [record.status, record.reason, record.last_modified, record.modified_by, record.id]
        );
      }
      
      // Insert new records
      if (recordsToInsert.length > 0) {
        await db.query(
          `INSERT INTO student_attendance 
           (enrollment_id, date, status, reason, recorded_by)
           VALUES ?`,
          [recordsToInsert]
        );
      }
      
      await db.query('COMMIT');
      
      res.status(201).json({
        message: 'Attendance recorded successfully',
        date,
        section_name: sectionExists[0].name,
        updated_count: recordsToUpdate.length,
        inserted_count: recordsToInsert.length,
        total_records: validRecords.length
      });
    } catch (err) {
      await db.query('ROLLBACK');
      console.error('Error recording attendance:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error processing attendance records:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/attendance/:sectionId/attendance
 * @desc    Get attendance records for a section with optional date range
 * @access  Private (Teachers assigned to section, Admins)
 */
router.get('/:sectionId/attendance', protect, canManageSectionAttendance, async (req, res) => {
  const { sectionId } = req.params;
  const { start_date, end_date, date } = req.query;
  
  // Validate date parameters if provided
  if (start_date && !isValidDate(start_date)) {
    return res.status(400).json({ error: 'Invalid start_date format. Please use YYYY-MM-DD format.' });
  }
  
  if (end_date && !isValidDate(end_date)) {
    return res.status(400).json({ error: 'Invalid end_date format. Please use YYYY-MM-DD format.' });
  }
  
  if (date && !isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD format.' });
  }
  
  try {
    // Verify section exists
    const [sectionExists] = await db.query(
      `SELECT s.id, s.name, c.name as class_name, c.grade_level, ay.name as academic_year
       FROM sections s
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE s.id = ?`,
      [sectionId]
    );
    
    if (sectionExists.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // Get active students in the section
    const [students] = await db.query(
      `SELECT se.id as enrollment_id, se.student_id, se.roll_number, u.full_name
       FROM student_enrollments se
       JOIN users u ON se.student_id = u.id
       WHERE se.section_id = ? AND se.is_active = 1
       ORDER BY se.roll_number ASC, u.full_name ASC`,
      [sectionId]
    );
    
    if (students.length === 0) {
      return res.status(200).json({
        section: sectionExists[0],
        students: [],
        attendance_records: [],
        message: 'No active students in this section'
      });
    }
    
    // Build query for attendance records
    let attendanceQuery = `
      SELECT sa.id, sa.enrollment_id, sa.date, sa.status, sa.reason,
             u1.full_name as recorded_by_name,
             u2.full_name as modified_by_name,
             sa.last_modified
      FROM student_attendance sa
      JOIN student_enrollments se ON sa.enrollment_id = se.id
      LEFT JOIN users u1 ON sa.recorded_by = u1.id
      LEFT JOIN users u2 ON sa.modified_by = u2.id
      WHERE se.section_id = ?
    `;
    
    const queryParams = [sectionId];
    
    // Add date filters if provided
    if (date) {
      attendanceQuery += ' AND sa.date = ?';
      queryParams.push(date);
    } else if (start_date && end_date) {
      attendanceQuery += ' AND sa.date BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    } else if (start_date) {
      attendanceQuery += ' AND sa.date >= ?';
      queryParams.push(start_date);
    } else if (end_date) {
      attendanceQuery += ' AND sa.date <= ?';
      queryParams.push(end_date);
    }
    
    attendanceQuery += ' ORDER BY sa.date DESC, se.roll_number ASC, sa.enrollment_id ASC';
    
    // Get attendance records
    const [attendanceRecords] = await db.query(attendanceQuery, queryParams);
    
    // Organize records by date and student
    const recordsByDate = {};
    const studentAttendance = {};
    
    // Initialize student attendance tracking
    students.forEach(student => {
      studentAttendance[student.enrollment_id] = {
        enrollment_id: student.enrollment_id,
        student_id: student.student_id,
        student_name: student.full_name,
        roll_number: student.roll_number,
        total_days: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        present_percentage: 0,
        last_status: null,
        last_date: null
      };
    });
    
    // Process attendance records
    attendanceRecords.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      
      // Group by date
      if (!recordsByDate[dateStr]) {
        recordsByDate[dateStr] = {
          date: dateStr,
          records: [],
          summary: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          }
        };
      }
      
      recordsByDate[dateStr].records.push(record);
      recordsByDate[dateStr].summary.total++;
      recordsByDate[dateStr].summary[record.status]++;
      
      // Update student attendance summary
      if (studentAttendance[record.enrollment_id]) {
        const student = studentAttendance[record.enrollment_id];
        student.total_days++;
        student[record.status]++;
        
        // Track last status and date
        if (!student.last_date || new Date(dateStr) > new Date(student.last_date)) {
          student.last_status = record.status;
          student.last_date = dateStr;
        }
      }
    });
    
    // Calculate percentages for each student
    Object.values(studentAttendance).forEach(student => {
      if (student.total_days > 0) {
        student.present_percentage = Math.round((student.present / student.total_days) * 100);
      }
    });
    
    // Calculate overall section statistics
    const sectionStats = {
      total_attendance_days: Object.keys(recordsByDate).length,
      total_records: attendanceRecords.length,
      overall: {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0
      }
    };
    
    // Sum up status counts
    Object.values(recordsByDate).forEach(day => {
      sectionStats.overall.present += day.summary.present;
      sectionStats.overall.absent += day.summary.absent;
      sectionStats.overall.late += day.summary.late;
      sectionStats.overall.excused += day.summary.excused;
      sectionStats.overall.total += day.summary.total;
    });
    
    // Calculate percentages
    if (sectionStats.overall.total > 0) {
      sectionStats.overall.present_percentage = Math.round((sectionStats.overall.present / sectionStats.overall.total) * 100);
      sectionStats.overall.absent_percentage = Math.round((sectionStats.overall.absent / sectionStats.overall.total) * 100);
      sectionStats.overall.late_percentage = Math.round((sectionStats.overall.late / sectionStats.overall.total) * 100);
      sectionStats.overall.excused_percentage = Math.round((sectionStats.overall.excused / sectionStats.overall.total) * 100);
    }
    
    res.json({
      section: sectionExists[0],
      students: students,
      statistics: sectionStats,
      attendance_by_date: Object.values(recordsByDate),
      student_attendance: Object.values(studentAttendance)
    });
  } catch (err) {
    console.error('Error fetching section attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/attendance/:enrollmentId/attendance
 * @desc    Get attendance records for a specific student
 * @access  Private (Teachers, Admins, Student themselves, Parents)
 */
router.get('/:enrollmentId/attendance', protect, canViewStudentAttendance, async (req, res) => {
  const { enrollmentId } = req.params;
  const { start_date, end_date, status } = req.query;
  
  // Validate date parameters if provided
  if (start_date && !isValidDate(start_date)) {
    return res.status(400).json({ error: 'Invalid start_date format. Please use YYYY-MM-DD format.' });
  }
  
  if (end_date && !isValidDate(end_date)) {
    return res.status(400).json({ error: 'Invalid end_date format. Please use YYYY-MM-DD format.' });
  }
  
  // Validate status if provided
  if (status && !isValidStatus(status)) {
    return res.status(400).json({ 
      error: 'Invalid status. Must be one of: present, absent, late, excused' 
    });
  }
  
  try {
    // Get enrollment details
    const [enrollment] = await db.query(
      `SELECT se.id, se.student_id, se.roll_number, se.section_id,
              u.full_name as student_name,
              s.name as section_name, c.name as class_name,
              c.grade_level, ay.name as academic_year_name
       FROM student_enrollments se
       JOIN users u ON se.student_id = u.id
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE se.id = ?`,
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    // Build query for attendance records
    let query = `
      SELECT sa.id, sa.date, sa.status, sa.reason,
             u1.full_name as recorded_by_name,
             sa.last_modified,
             u2.full_name as modified_by_name
      FROM student_attendance sa
      LEFT JOIN users u1 ON sa.recorded_by = u1.id
      LEFT JOIN users u2 ON sa.modified_by = u2.id
      WHERE sa.enrollment_id = ?
    `;
    
    const queryParams = [enrollmentId];
    
    // Add date filters if provided
    if (start_date && end_date) {
      query += ' AND sa.date BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    } else if (start_date) {
      query += ' AND sa.date >= ?';
      queryParams.push(start_date);
    } else if (end_date) {
      query += ' AND sa.date <= ?';
      queryParams.push(end_date);
    }
    
    // Add status filter if provided
    if (status) {
      query += ' AND sa.status = ?';
      queryParams.push(status);
    }
    
    query += ' ORDER BY sa.date DESC';
    
    // Get attendance records
    const [records] = await db.query(query, queryParams);
    
    // Calculate attendance statistics
    const stats = {
      total_days: records.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };
    
    records.forEach(record => {
      stats[record.status]++;
    });
    
    if (stats.total_days > 0) {
      stats.present_percentage = Math.round((stats.present / stats.total_days) * 100);
      stats.absent_percentage = Math.round((stats.absent / stats.total_days) * 100);
      stats.late_percentage = Math.round((stats.late / stats.total_days) * 100);
      stats.excused_percentage = Math.round((stats.excused / stats.total_days) * 100);
    }
    
    // Get the attendance record for today if it exists
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = records.find(r => {
      const recordDate = r.date.toISOString().split('T')[0];
      return recordDate === today;
    });
    
    res.json({
      enrollment: enrollment[0],
      today_status: todayRecord ? todayRecord.status : null,
      statistics: stats,
      records: records
    });
  } catch (err) {
    console.error('Error fetching student attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/attendance/:sectionId/attendance/:date
 * @desc    Update attendance records for a specific date
 * @access  Private (Teachers assigned to section, Admins)
 */
router.put('/:sectionId/attendance/:date', protect, canManageSectionAttendance, async (req, res) => {
  const { sectionId, date } = req.params;
  const { records } = req.body;
  
  // Validate required fields
  if (!records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ 
      error: 'Please provide attendance records array' 
    });
  }
  
  // Validate date
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD format.' });
  }
  
  // Prevent future attendance
  const currentDate = new Date();
  const attendanceDate = new Date(date);
  if (attendanceDate > currentDate) {
    return res.status(400).json({ error: 'Cannot update attendance for future dates' });
  }
  
  try {
    // Verify section exists
    const [sectionExists] = await db.query(
      'SELECT id, name FROM sections WHERE id = ?',
      [sectionId]
    );
    
    if (sectionExists.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // Get enrollments for this section
    const [enrollments] = await db.query(
      `SELECT se.id, se.student_id, u.full_name
       FROM student_enrollments se
       JOIN users u ON se.student_id = u.id
       WHERE se.section_id = ? AND se.is_active = 1`,
      [sectionId]
    );
    
    if (enrollments.length === 0) {
      return res.status(400).json({ error: 'No active students in this section' });
    }
    
    // Create a map of enrollment IDs for validation
    const enrollmentMap = new Map();
    enrollments.forEach(e => enrollmentMap.set(e.id, e));
    
    // Validate all records
    const invalidRecords = [];
    const validRecords = [];
    
    records.forEach(record => {
      // Validate enrollment ID
      if (!enrollmentMap.has(record.enrollment_id)) {
        invalidRecords.push({
          enrollment_id: record.enrollment_id,
          reason: 'Invalid enrollment ID'
        });
        return;
      }
      
      // Validate status
      if (!record.status || !isValidStatus(record.status)) {
        invalidRecords.push({
          enrollment_id: record.enrollment_id,
          reason: 'Invalid status. Must be one of: present, absent, late, excused'
        });
        return;
      }
      
      validRecords.push({
        enrollment_id: record.enrollment_id,
        status: record.status.toLowerCase(),
        reason: record.reason || null,
        student_name: enrollmentMap.get(record.enrollment_id).full_name
      });
    });
    
    if (invalidRecords.length > 0) {
      return res.status(400).json({ 
        error: 'One or more invalid attendance records',
        invalid_records: invalidRecords
      });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Get existing attendance records for this date
      const [existingRecords] = await db.query(
        `SELECT id, enrollment_id 
         FROM student_attendance 
         WHERE DATE(date) = ? AND enrollment_id IN (?)`,
        [date, validRecords.map(r => r.enrollment_id)]
      );
      
      // Create a map of existing records
      const existingMap = new Map();
      existingRecords.forEach(record => {
        existingMap.set(record.enrollment_id, record.id);
      });
      
      // Process records for update or insert
      const updates = [];
      const inserts = [];
      
      validRecords.forEach(record => {
        if (existingMap.has(record.enrollment_id)) {
          // Update existing record
          updates.push({
            id: existingMap.get(record.enrollment_id),
            status: record.status,
            reason: record.reason,
            last_modified: new Date().toISOString().split('T')[0],
            modified_by: req.user.id
          });
        } else {
          // Insert new record
          inserts.push([
            record.enrollment_id,
            date,
            record.status,
            record.reason,
            req.user.id
          ]);
        }
      });
      
      // Execute updates
      for (const update of updates) {
        await db.query(
          `UPDATE student_attendance
           SET status = ?, reason = ?, last_modified = ?, modified_by = ?
           WHERE id = ?`,
          [update.status, update.reason, update.last_modified, update.modified_by, update.id]
        );
      }
      
      // Execute inserts
      if (inserts.length > 0) {
        await db.query(
          `INSERT INTO student_attendance
           (enrollment_id, date, status, reason, recorded_by)
           VALUES ?`,
          [inserts]
        );
      }
      
      await db.query('COMMIT');
      
      res.json({
        message: 'Attendance updated successfully',
        date,
        section_name: sectionExists[0].name,
        records_updated: updates.length,
        records_added: inserts.length,
        total_records: validRecords.length
      });
    } catch (err) {
      await db.query('ROLLBACK');
      console.error('Error updating attendance:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error processing attendance update:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/attendance/report/:enrollmentId
 * @desc    Generate comprehensive attendance report for a student
 * @access  Private (Teachers, Admins, Student themselves, Parents)
 */
router.get('/report/:enrollmentId', protect, canViewStudentAttendance, async (req, res) => {
  const { enrollmentId } = req.params;
  
  try {
    // Get enrollment details
    const [enrollment] = await db.query(
      `SELECT se.id, se.student_id, se.roll_number, se.enrollment_date,
              u.full_name as student_name,
              s.name as section_name, s.id as section_id,
              c.name as class_name, c.grade_level,
              ay.name as academic_year_name, ay.id as academic_year_id,
              ay.start_date as academic_year_start, ay.end_date as academic_year_end
       FROM student_enrollments se
       JOIN users u ON se.student_id = u.id
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE se.id = ?`,
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    const studentInfo = enrollment[0];
    
    // Get all attendance records for this enrollment
    const [attendanceRecords] = await db.query(
      `SELECT sa.id, sa.date, sa.status, sa.reason, 
              sa.recorded_by, u1.full_name as recorded_by_name,
              sa.modified_by, u2.full_name as modified_by_name, 
              sa.last_modified
       FROM student_attendance sa
       LEFT JOIN users u1 ON sa.recorded_by = u1.id
       LEFT JOIN users u2 ON sa.modified_by = u2.id
       WHERE sa.enrollment_id = ?
       ORDER BY sa.date ASC`,
      [enrollmentId]
    );
    
    if (attendanceRecords.length === 0) {
      return res.status(200).json({
        student: studentInfo,
        message: 'No attendance records found for this enrollment',
        summary: {
          total_days: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          present_percentage: 0
        },
        monthly_breakdown: [],
        records: []
      });
    }
    
    // Get school days in academic year for context
    const academicYearStart = new Date(studentInfo.academic_year_start);
    const academicYearEnd = new Date(studentInfo.academic_year_end);
    
    // Try to get school calendar for more accurate data
    let [schoolDays] = await db.query(
      `SELECT COUNT(*) as total_school_days
       FROM school_calendar
       WHERE academic_year_id = ? AND is_school_day = 1`,
      [studentInfo.academic_year_id]
    ).catch(() => {
      return [[{ total_school_days: 0 }]]; // Default if table doesn't exist
    });
    
    // Calculate total school days if calendar not available
    const totalSchoolDays = schoolDays[0].total_school_days > 0 
      ? schoolDays[0].total_school_days 
      : calculateSchoolDays(academicYearStart, academicYearEnd);
    
    // Basic attendance summary
    const summary = {
      total_days: attendanceRecords.length,
      total_school_days: totalSchoolDays,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      unrecorded: Math.max(0, totalSchoolDays - attendanceRecords.length),
      consecutive_absences: 0,
      max_consecutive_absences: 0
    };
    
    // Monthly and term breakdown
    const monthlyAttendance = {};
    const termAttendance = {};
    const dowAttendance = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} }; // Day of week patterns
    
    // Absence patterns
    let currentConsecutiveAbsences = 0;
    let maxConsecutiveAbsences = 0;
    let lastAbsenceDate = null;
    const absenceDetails = [];
    
    // Process each record
    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.date);
      const month = recordDate.getMonth();
      const year = recordDate.getFullYear();
      const monthKey = `${year}-${month + 1}`;
      const dayOfWeek = recordDate.getDay();
      
      // Initialize month if needed
      if (!monthlyAttendance[monthKey]) {
        monthlyAttendance[monthKey] = {
          month: monthKey,
          month_name: getMonthName(month),
          year,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0
        };
      }
      
      // Determine term (this could be enhanced with actual term dates from DB)
      let term = determineTerm(recordDate, academicYearStart, academicYearEnd);
      if (!termAttendance[term]) {
        termAttendance[term] = {
          term,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0
        };
      }
      
      // Initialize day of week tracking
      if (!dowAttendance[dayOfWeek][record.status]) {
        dowAttendance[dayOfWeek][record.status] = 0;
      }
      
      // Update counters
      summary[record.status]++;
      monthlyAttendance[monthKey][record.status]++;
      monthlyAttendance[monthKey].total++;
      termAttendance[term][record.status]++;
      termAttendance[term].total++;
      dowAttendance[dayOfWeek][record.status]++;
      
      // Track absence patterns
      if (record.status === 'absent') {
        absenceDetails.push({
          date: record.date,
          reason: record.reason,
          day_of_week: getDayName(dayOfWeek)
        });
        
        currentConsecutiveAbsences++;
        
        // Check if consecutive with previous absence
        if (lastAbsenceDate) {
          const lastDate = new Date(lastAbsenceDate);
          const dayDiff = Math.floor((recordDate - lastDate) / (1000 * 60 * 60 * 24));
          
          // If not consecutive, reset counter
          if (dayDiff > 1) {
            currentConsecutiveAbsences = 1;
          }
        }
        
        lastAbsenceDate = record.date;
        maxConsecutiveAbsences = Math.max(maxConsecutiveAbsences, currentConsecutiveAbsences);
      } else {
        currentConsecutiveAbsences = 0;
      }
    });
    
    // Calculate percentages
    summary.present_percentage = summary.total_days > 0 
      ? Math.round((summary.present / summary.total_days) * 100) 
      : 0;
    summary.absent_percentage = summary.total_days > 0 
      ? Math.round((summary.absent / summary.total_days) * 100) 
      : 0;
    summary.attendance_rate = totalSchoolDays > 0 
      ? Math.round((summary.present / totalSchoolDays) * 100) 
      : 0;
    summary.max_consecutive_absences = maxConsecutiveAbsences;
    
    // Calculate monthly percentages
    Object.values(monthlyAttendance).forEach(month => {
      if (month.total > 0) {
        month.present_percentage = Math.round((month.present / month.total) * 100);
        month.absent_percentage = Math.round((month.absent / month.total) * 100);
        month.late_percentage = Math.round((month.late / month.total) * 100);
        month.excused_percentage = Math.round((month.excused / month.total) * 100);
      }
    });
    
    // Calculate term percentages
    Object.values(termAttendance).forEach(term => {
      if (term.total > 0) {
        term.present_percentage = Math.round((term.present / term.total) * 100);
        term.absent_percentage = Math.round((term.absent / term.total) * 100);
        term.late_percentage = Math.round((term.late / term.total) * 100);
        term.excused_percentage = Math.round((term.excused / term.total) * 100);
      }
    });
    
    // Analyze day of week patterns
    const dayOfWeekPatterns = [];
    for (let i = 0; i < 7; i++) {
      const dayData = dowAttendance[i];
      const total = Object.values(dayData).reduce((sum, count) => sum + count, 0);
      
      if (total > 0) {
        dayOfWeekPatterns.push({
          day: getDayName(i),
          day_number: i,
          total,
          present: dayData.present || 0,
          absent: dayData.absent || 0,
          late: dayData.late || 0,
          excused: dayData.excused || 0,
          present_percentage: dayData.present ? Math.round((dayData.present / total) * 100) : 0,
          absent_percentage: dayData.absent ? Math.round((dayData.absent / total) * 100) : 0,
          late_percentage: dayData.late ? Math.round((dayData.late / total) * 100) : 0,
          excused_percentage: dayData.excused ? Math.round((dayData.excused / total) * 100) : 0
        });
      }
    }
    
    // Sort day of week patterns by absence rate (highest first) to identify problematic days
    dayOfWeekPatterns.sort((a, b) => b.absent_percentage - a.absent_percentage);
    
    // Analyze absence patterns
    const absencePatterns = {
      total_absences: summary.absent,
      excused_absences: summary.excused,
      unexcused_absences: summary.absent - summary.excused,
      max_consecutive_absences: maxConsecutiveAbsences,
      absence_details: absenceDetails,
      most_common_reasons: getMostCommonReasons(absenceDetails),
      day_of_week_distribution: dayOfWeekPatterns.map(day => ({
        day: day.day,
        absent_count: day.absent,
        percentage: day.absent_percentage
      })),
      days_with_highest_absences: dayOfWeekPatterns.length > 0 ? dayOfWeekPatterns[0].day : 'N/A'
    };
    
    // Analyze late arrival patterns
    const latePatterns = {
      total_late_arrivals: summary.late,
      percentage_of_attendance: summary.total_days > 0 ? Math.round((summary.late / summary.total_days) * 100) : 0,
      day_of_week_distribution: dayOfWeekPatterns.map(day => ({
        day: day.day,
        late_count: day.late,
        percentage: day.late_percentage
      }))
    };
    
    // Calculate attendance trends (month-to-month changes)
    const monthlyArray = Object.values(monthlyAttendance);
    const attendanceTrends = [];
    
    if (monthlyArray.length >= 2) {
      // Sort months chronologically
      monthlyArray.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return parseInt(a.month) - parseInt(b.month);
      });
      
      // Calculate trends
      for (let i = 1; i < monthlyArray.length; i++) {
        const prevMonth = monthlyArray[i - 1];
        const currMonth = monthlyArray[i];
        
        if (prevMonth.total > 0 && currMonth.total > 0) {
          const presentChange = currMonth.present_percentage - prevMonth.present_percentage;
          const absentChange = currMonth.absent_percentage - prevMonth.absent_percentage;
          
          attendanceTrends.push({
            from_month: prevMonth.month_name,
            to_month: currMonth.month_name,
            present_change: presentChange,
            absent_change: absentChange,
            trend: presentChange > 0 ? 'improving' : (presentChange < 0 ? 'declining' : 'stable')
          });
        }
      }
    }
    
    // Build the final report
    const report = {
      student: {
        id: studentInfo.student_id,
        name: studentInfo.student_name,
        roll_number: studentInfo.roll_number
      },
      enrollment: {
        id: parseInt(enrollmentId),
        section: studentInfo.section_name,
        class: studentInfo.class_name,
        grade_level: studentInfo.grade_level,
        academic_year: studentInfo.academic_year_name,
        enrollment_date: studentInfo.enrollment_date
      },
      summary: summary,
      monthly_breakdown: Object.values(monthlyAttendance).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return parseInt(a.month) - parseInt(b.month);
      }),
      term_summary: Object.values(termAttendance),
      day_of_week_patterns: dayOfWeekPatterns,
      absence_patterns: absencePatterns,
      late_patterns: latePatterns,
      attendance_trends: attendanceTrends,
      recent_attendance: attendanceRecords.slice(-10).map(record => ({
        date: record.date,
        status: record.status,
        reason: record.reason
      }))
    };
    
    res.json(report);
  } catch (err) {
    console.error('Error generating attendance report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper Functions

// Calculate approximate school days in a date range (Mon-Fri, excluding common holidays)
function calculateSchoolDays(startDate, endDate) {
  try {
    if (!startDate || !endDate || startDate > endDate) {
      return 0;
    }
    
    let count = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Count only weekdays (Monday to Friday)
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        count++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Approximate holiday reduction (simplified)
    // In a real system, this would use a holiday calendar table
    const approximateHolidays = Math.round(count * 0.1); // ~10% of weekdays
    
    return count - approximateHolidays;
  } catch (err) {
    console.error('Error calculating school days:', err);
    return 0;
  }
}

// Get month name from month index
function getMonthName(monthIndex) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return months[monthIndex] || 'Unknown';
}

// Get day name from day index
function getDayName(dayIndex) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] || 'Unknown';
}

// Determine term based on date
function determineTerm(date, academicYearStart, academicYearEnd) {
  try {
    if (!date || !academicYearStart || !academicYearEnd) {
      return 'Unknown';
    }
    
    // Simple calculation dividing academic year into 3 terms
    const totalDays = (academicYearEnd - academicYearStart) / (1000 * 60 * 60 * 24);
    const termLength = totalDays / 3;
    
    const daysSinceStart = (date - academicYearStart) / (1000 * 60 * 60 * 24);
    
    if (daysSinceStart < termLength) {
      return 'Term 1';
    } else if (daysSinceStart < termLength * 2) {
      return 'Term 2';
    } else {
      return 'Term 3';
    }
  } catch (err) {
    console.error('Error determining term:', err);
    return 'Unknown';
  }
}

// Get most common reasons for absences
function getMostCommonReasons(absenceDetails) {
  try {
    if (!absenceDetails || absenceDetails.length === 0) {
      return [];
    }
    
    const reasonCounts = {};
    
    // Count occurrences of each reason
    absenceDetails.forEach(absence => {
      const reason = absence.reason || 'No reason provided';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    
    // Convert to array and sort by count
    const sortedReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
    
    return sortedReasons.slice(0, 5); // Return top 5 reasons
  } catch (err) {
    console.error('Error analyzing absence reasons:', err);
    return [];
  }
}

module.exports = router;
