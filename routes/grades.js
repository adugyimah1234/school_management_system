// routes/grades.js
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

// Helper function to check if user is authorized to manage grades for a specific enrollment
const canManageGrades = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Admin has full access
  if (req.user.role === 'admin') {
    return next();
  }
  
  const { enrollmentId } = req.params;
  
  try {
    // Get enrollment information
    const [enrollment] = await db.promise().query(
      `SELECT se.student_id, se.section_id, s.teacher_id, c.id as class_id
       FROM student_enrollments se
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       WHERE se.id = ?`,
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    // Check if user is the teacher assigned to the section
    if (req.user.role === 'teacher') {
      if (req.user.id === enrollment[0].teacher_id) {
        // Teacher is directly assigned to this section
        return next();
      }
      
      // Check if teacher teaches this subject to this class (for subject teachers)
      if (req.body.subject_id) {
        const [teachesSubject] = await db.promise().query(
          `SELECT 1 FROM teacher_subjects
           WHERE teacher_id = ? AND subject_id = ?`,
          [req.user.id, req.body.subject_id]
        );
        
        if (teachesSubject.length > 0) {
          return next();
        }
      }
      
      return res.status(403).json({ 
        error: 'You are not authorized to manage grades for this enrollment' 
      });
    }
    
    // Reject others
    return res.status(403).json({ 
      error: 'Only teachers assigned to this class/subject or admins can manage grades' 
    });
  } catch (err) {
    console.error('Error checking grade management authorization:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Helper function to validate grade value
const validateGrade = (grade, gradeScale = 100) => {
  // Parse grade as number
  const numericGrade = parseFloat(grade);
  
  // Check if grade is a valid number
  if (isNaN(numericGrade)) {
    return { valid: false, error: 'Grade must be a valid number' };
  }
  
  // Check if grade is within acceptable range
  if (numericGrade < 0 || numericGrade > gradeScale) {
    return { 
      valid: false, 
      error: `Grade must be between 0 and ${gradeScale}` 
    };
  }
  
  return { valid: true, value: numericGrade };
};

/**
 * @route   POST /api/grades/:enrollmentId/grades
 * @desc    Record grades for a student
 * @access  Private (Teachers, Admins)
 */
router.post('/:enrollmentId/grades', protect, canManageGrades, async (req, res) => {
  const { enrollmentId } = req.params;
  const { subject_id, term, grade_value, remarks } = req.body;
  
  // Validate required fields
  if (!subject_id || !term || grade_value === undefined) {
    return res.status(400).json({ 
      error: 'Please provide all required fields: subject_id, term, grade_value' 
    });
  }
  
  // Validate grade value
  const gradeValidation = validateGrade(grade_value);
  if (!gradeValidation.valid) {
    return res.status(400).json({ error: gradeValidation.error });
  }
  
  try {
    // Verify enrollment exists and is active
    const [enrollmentExists] = await db.promise().query(
      'SELECT id, student_id FROM student_enrollments WHERE id = ? AND is_active = 1',
      [enrollmentId]
    );
    
    if (enrollmentExists.length === 0) {
      return res.status(404).json({ error: 'Active enrollment not found' });
    }
    
    // Verify subject exists
    const [subjectExists] = await db.promise().query(
      'SELECT id FROM subjects WHERE id = ?',
      [subject_id]
    );
    
    if (subjectExists.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Check if grade already exists for this enrollment-subject-term combination
    const [existingGrade] = await db.promise().query(
      'SELECT id FROM student_grades WHERE enrollment_id = ? AND subject_id = ? AND term = ?',
      [enrollmentId, subject_id, term]
    );
    
    if (existingGrade.length > 0) {
      return res.status(400).json({ 
        error: 'Grade already exists for this subject and term. Use PUT to update.' 
      });
    }
    
    // Record the grade
    const graded_date = new Date().toISOString().split('T')[0]; // Current date
    
    const [result] = await db.promise().query(
      `INSERT INTO student_grades 
       (enrollment_id, subject_id, term, grade_value, remarks, graded_date, graded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        enrollmentId,
        subject_id,
        term,
        gradeValidation.value,
        remarks || null,
        graded_date,
        req.user.id // The current authenticated user is recording the grade
      ]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'Grade recorded successfully'
    });
  } catch (err) {
    console.error('Error recording grade:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/grades/:enrollmentId/grades
 * @desc    Get student grades for a specific enrollment
 * @access  Private (Teachers, Admins, Student themselves, Parents)
 */
router.get('/:enrollmentId/grades', protect, async (req, res) => {
  const { enrollmentId } = req.params;
  const { term } = req.query; // Optional term filter
  
  try {
    // Get enrollment information
    const [enrollment] = await db.promise().query(
      `SELECT se.id, se.student_id, se.section_id, se.roll_number,
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
    
    // Authorization check (admin, teacher of class/section, student themselves, parent)
    const student_id = enrollment[0].student_id;
    const section_id = enrollment[0].section_id;
    
    if (req.user.role !== 'admin') {
      // Teacher check
      if (req.user.role === 'teacher') {
        const [hasAccess] = await db.promise().query(
          `SELECT 1 FROM sections WHERE id = ? AND teacher_id = ? 
           UNION 
           SELECT 1 FROM teacher_subjects ts
           JOIN student_grades sg ON ts.subject_id = sg.subject_id
           WHERE ts.teacher_id = ? AND sg.enrollment_id = ?
           LIMIT 1`,
          [section_id, req.user.id, req.user.id, enrollmentId]
        );
        
        if (hasAccess.length === 0) {
          return res.status(403).json({ 
            error: 'You are not authorized to view grades for this enrollment' 
          });
        }
      } 
      // Student check - can only view their own grades
      else if (req.user.role === 'student' && req.user.id !== student_id) {
        return res.status(403).json({ 
          error: 'You can only view your own grades' 
        });
      } 
      // Parent check - can only view their children's grades
      else if (req.user.role === 'parent') {
        const [hasAccess] = await db.promise().query(
          `SELECT 1 FROM guardian_students 
           WHERE guardian_id = ? AND student_id = ? 
           LIMIT 1`,
          [req.user.id, student_id]
        );
        
        if (hasAccess.length === 0) {
          return res.status(403).json({ 
            error: 'You can only view grades for your own children' 
          });
        }
      }
    }
    
    // Build query for grades
    let query = `
      SELECT sg.*, 
             s.name as subject_name, 
             s.code as subject_code,
             s.credits,
             u.full_name as graded_by_name
      FROM student_grades sg
      JOIN subjects s ON sg.subject_id = s.id
      JOIN users u ON sg.graded_by = u.id
      WHERE sg.enrollment_id = ?
    `;
    
    const queryParams = [enrollmentId];
    
    // Add term filter if provided
    if (term) {
      query += ' AND sg.term = ?';
      queryParams.push(term);
    }
    
    query += ' ORDER BY s.name ASC, sg.term ASC';
    
    // Get grades
    const [grades] = await db.promise().query(query, queryParams);
    
    // Calculate statistics if grades exist
    let statistics = null;
    if (grades.length > 0) {
      // Group grades by term
      const termGrades = {};
      let totalSum = 0;
      let totalCount = 0;
      
      grades.forEach(grade => {
        if (!termGrades[grade.term]) {
          termGrades[grade.term] = {
            sum: 0,
            count: 0,
            grades: []
          };
        }
        
        termGrades[grade.term].sum += grade.grade_value;
        termGrades[grade.term].count++;
        termGrades[grade.term].grades.push(grade.grade_value);
        
        totalSum += grade.grade_value;
        totalCount++;
      });
      
      // Calculate averages and other statistics
      statistics = {
        overall_average: totalSum / totalCount,
        term_averages: {},
        highest_grade: Math.max(...grades.map(g => g.grade_value)),
        lowest_grade: Math.min(...grades.map(g => g.grade_value)),
        grade_count: totalCount
      };
      
      // Calculate term averages
      Object.keys(termGrades).forEach(term => {
        statistics.term_averages[term] = {
          average: termGrades[term].sum / termGrades[term].count,
          highest: Math.max(...termGrades[term].grades),
          lowest: Math.min(...termGrades[term].grades),
          count: termGrades[term].count
        };
      });
    }
    
    res.json({
      enrollment: {
        id: enrollment[0].id,
        student_id: student_id,
        student_name: enrollment[0].student_name,
        roll_number: enrollment[0].roll_number,
        section_name: enrollment[0].section_name,
        class_name: enrollment[0].class_name,
        grade_level: enrollment[0].grade_level,
        academic_year: enrollment[0].academic_year_name
      },
      grades,
      statistics
    });
  } catch (err) {
    console.error('Error fetching grades:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/grades/:enrollmentId/grades/:gradeId
 * @desc    Update an existing grade
 * @access  Private (Teachers who gave the grade, Admins)
 */
router.put('/:enrollmentId/grades/:gradeId', protect, async (req, res) => {
  const { enrollmentId, gradeId } = req.params;
  const { grade_value, remarks } = req.body;
  
  // Validate grade value if provided
  if (grade_value !== undefined) {
    const gradeValidation = validateGrade(grade_value);
    if (!gradeValidation.valid) {
      return res.status(400).json({ error: gradeValidation.error });
    }
  }
  
  try {
    // Get the existing grade to check permissions
    const [existingGrade] = await db.promise().query(
      `SELECT sg.*, s.name as subject_name
       FROM student_grades sg
       JOIN subjects s ON sg.subject_id = s.id
       WHERE sg.id = ? AND sg.enrollment_id = ?`,
      [gradeId, enrollmentId]
    );
    
    if (existingGrade.length === 0) {
      return res.status(404).json({ error: 'Grade not found or does not belong to this enrollment' });
    }
    
    const grade = existingGrade[0];
    
    // Authorization check (admin or the teacher who gave the grade)
    if (req.user.role !== 'admin' && req.user.id !== grade.graded_by) {
      return res.status(403).json({ 
        error: 'You can only modify grades that you have recorded' 
      });
    }
    
    // Update the grade
    const updateFields = [];
    const updateValues = [];
    
    if (grade_value !== undefined) {
      updateFields.push('grade_value = ?');
      updateValues.push(parseFloat(grade_value));
    }
    
    if (remarks !== undefined) {
      updateFields.push('remarks = ?');
      updateValues.push(remarks || null);
    }
    
    // Add last modified info
    updateFields.push('last_modified = ?');
    updateValues.push(new Date().toISOString().split('T')[0]);
    
    updateFields.push('last_modified_by = ?');
    updateValues.push(req.user.id);
    
    // Only proceed if there are fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }
    
    updateValues.push(gradeId);
    
    const [result] = await db.promise().query(
      `UPDATE student_grades SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    
    res.json({
      message: 'Grade updated successfully',
      subject: grade.subject_name
    });
  } catch (err) {
    console.error('Error updating grade:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   DELETE /api/grades/:enrollmentId/grades/:gradeId
 * @desc    Delete a grade record
 * @access  Private (Admin only, or teacher who recorded the grade)
 */
router.delete('/:enrollmentId/grades/:gradeId', protect, async (req, res) => {
  const { enrollmentId, gradeId } = req.params;
  
  try {
    // Get the existing grade to check permissions
    const [existingGrade] = await db.promise().query(
      `SELECT sg.*, s.name as subject_name
       FROM student_grades sg
       JOIN subjects s ON sg.subject_id = s.id
       WHERE sg.id = ? AND sg.enrollment_id = ?`,
      [gradeId, enrollmentId]
    );
    
    if (existingGrade.length === 0) {
      return res.status(404).json({ error: 'Grade not found or does not belong to this enrollment' });
    }
    
    const grade = existingGrade[0];
    
    // Authorization check (admin or the teacher who gave the grade)
    if (req.user.role !== 'admin' && req.user.id !== grade.graded_by) {
      return res.status(403).json({ 
        error: 'You can only delete grades that you have recorded' 
      });
    }
    
    // Delete the grade
    const [result] = await db.promise().query(
      'DELETE FROM student_grades WHERE id = ?',
      [gradeId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    
    res.json({
      message: 'Grade deleted successfully',
      subject: grade.subject_name
    });
  } catch (err) {
    console.error('Error deleting grade:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/grades/report/:enrollmentId
 * @desc    Generate comprehensive grade report for a student
 * @access  Private (Admin, Teacher, Student themselves, Parents)
 */
router.get('/report/:enrollmentId', protect, async (req, res) => {
  const { enrollmentId } = req.params;
  
  try {
    // Get enrollment information
    const [enrollment] = await db.promise().query(
      `SELECT se.id, se.student_id, se.section_id, se.roll_number,
              u.full_name as student_name,
              s.name as section_name, c.name as class_name,
              c.grade_level, ay.name as academic_year_name,
              sc.name as school_name
       FROM student_enrollments se
       JOIN users u ON se.student_id = u.id
       JOIN sections s ON se.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       LEFT JOIN schools sc ON u.school_id = sc.id
       WHERE se.id = ?`,
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    // Authorization check similar to the regular grades endpoint
    const student_id = enrollment[0].student_id;
    const section_id = enrollment[0].section_id;
    
    if (req.user.role !== 'admin') {
      // Teacher check
      if (req.user.role === 'teacher') {
        const [hasAccess] = await db.promise().query(
          `SELECT 1 FROM sections WHERE id = ? AND teacher_id = ? 
           UNION 
           SELECT 1 FROM teacher_subjects ts
           JOIN student_grades sg ON ts.subject_id = sg.subject_id
           WHERE ts.teacher_id = ? AND sg.enrollment_id = ?
           LIMIT 1`,
          [section_id, req.user.id, req.user.id, enrollmentId]
        );
        
        if (hasAccess.length === 0) {
          return res.status(403).json({ 
            error: 'You are not authorized to view grade reports for this enrollment' 
          });
        }
      } 
      // Student check - can only view their own grades
      else if (req.user.role === 'student' && req.user.id !== student_id) {
        return res.status(403).json({ 
          error: 'You can only view your own grade reports' 
        });
      } 
      // Parent check - can only view their children's grades
      else if (req.user.role === 'parent') {
        const [hasAccess] = await db.promise().query(
          `SELECT 1 FROM guardian_students 
           WHERE guardian_id = ? AND student_id = ? 
           LIMIT 1`,
          [req.user.id, student_id]
        );
        
        if (hasAccess.length === 0) {
          return res.status(403).json({ 
            error: 'You can only view grade reports for your own children' 
          });
        }
      }
    }
    
    // Get all grades for this enrollment
    const [grades] = await db.promise().query(
      `SELECT sg.*, 
             s.name as subject_name, 
             s.code as subject_code,
             s.credits,
             u.full_name as graded_by_name
      FROM student_grades sg
      JOIN subjects s ON sg.subject_id = s.id
      JOIN users u ON sg.graded_by = u.id
      WHERE sg.enrollment_id = ?
      ORDER BY s.name ASC, sg.term ASC`,
      [enrollmentId]
    );
    
    // Get attendance summary for this enrollment if available
    let attendanceSummary = null;
    try {
      const [attendance] = await db.promise().query(
        `SELECT 
           COUNT(*) as total_days,
           SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
           SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
           SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_days
         FROM student_attendance
         WHERE enrollment_id = ?`,
        [enrollmentId]
      );
      
      if (attendance.length > 0 && attendance[0].total_days > 0) {
        attendanceSummary = attendance[0];
        const totalDays = attendanceSummary.total_days;
        attendanceSummary.present_percentage = 
          Math.round((attendanceSummary.present_days / totalDays) * 100);
        attendanceSummary.absent_percentage = 
          Math.round((attendanceSummary.absent_days / totalDays) * 100);
      }
    } catch (err) {
      console.log('Attendance data not available:', err);
      // Continue without attendance data
    }
    
    // Define grade letter mapping (customize based on school policy)
    const getGradeLetter = (score) => {
      if (score >= 90) return 'A+';
      if (score >= 85) return 'A';
      if (score >= 80) return 'A-';
      if (score >= 75) return 'B+';
      if (score >= 70) return 'B';
      if (score >= 65) return 'B-';
      if (score >= 60) return 'C+';
      if (score >= 55) return 'C';
      if (score >= 50) return 'C-';
      if (score >= 45) return 'D+';
      if (score >= 40) return 'D';
      return 'F';
    };
    
    // Define passing threshold (customize based on school policy)
    const passingThreshold = 40;
    
    // Prepare the report data
    const reportData = {
      student_info: {
        id: student_id,
        name: enrollment[0].student_name,
        roll_number: enrollment[0].roll_number,
        school: enrollment[0].school_name
      },
      enrollment_info: {
        id: parseInt(enrollmentId),
        section: enrollment[0].section_name,
        class: enrollment[0].class_name,
        grade_level: enrollment[0].grade_level,
        academic_year: enrollment[0].academic_year_name
      },
      attendance_summary: attendanceSummary,
      terms: {},
      subjects: {},
      overall_summary: {
        total_subjects: 0,
        average_grade: 0,
        total_credits: 0,
        gpa: null,
        passed_subjects: 0,
        failed_subjects: 0,
        highest_grade: null,
        lowest_grade: null,
        grade_distribution: {}
      }
    };
    
    // Process grades by term and subject
    if (grades.length > 0) {
      // Initialize counters
      let totalGradePoints = 0;
      let totalGradeValue = 0;
      let totalGradeCount = 0;
      let totalCredits = 0;
      let passedSubjects = 0;
      let failedSubjects = 0;
      const uniqueSubjects = new Set();
      const gradeDistribution = {
        'A+': 0, 'A': 0, 'A-': 0,
        'B+': 0, 'B': 0, 'B-': 0,
        'C+': 0, 'C': 0, 'C-': 0,
        'D+': 0, 'D': 0, 'F': 0
      };
      
      // Get all terms and initialize term objects
      const allTerms = [...new Set(grades.map(g => g.term))];
      allTerms.forEach(term => {
        reportData.terms[term] = {
          subjects: [],
          average: 0,
          highest: 0,
          lowest: 100,
          total: 0,
          count: 0,
          passed_subjects: 0,
          failed_subjects: 0
        };
      });
      
      // Process each grade
      grades.forEach(grade => {
        const { term, subject_id, subject_name, subject_code, grade_value, credits } = grade;
        const numericCredits = credits || 1;
        const gradeLetter = getGradeLetter(grade_value);
        uniqueSubjects.add(subject_id);
        
        // Update term data
        reportData.terms[term].subjects.push({
          subject_id,
          subject_name,
          subject_code,
          grade_value,
          grade_letter: gradeLetter,
          pass_status: grade_value >= passingThreshold ? 'Pass' : 'Fail',
          remarks: grade.remarks
        });
        
        reportData.terms[term].total += grade_value;
        reportData.terms[term].count++;
        reportData.terms[term].highest = Math.max(reportData.terms[term].highest, grade_value);
        reportData.terms[term].lowest = Math.min(reportData.terms[term].lowest, grade_value);
        
        if (grade_value >= passingThreshold) {
          reportData.terms[term].passed_subjects++;
        } else {
          reportData.terms[term].failed_subjects++;
        }
        
        // Initialize subject if not exists
        if (!reportData.subjects[subject_id]) {
          reportData.subjects[subject_id] = {
            id: subject_id,
            name: subject_name,
            code: subject_code,
            credits: numericCredits,
            terms: {},
            average: 0,
            total: 0,
            count: 0,
            highest: 0,
            lowest: 100,
            overall_status: 'Unknown'
          };
        }
        
        // Add grade to subject
        reportData.subjects[subject_id].terms[term] = {
          grade_value,
          grade_letter: gradeLetter,
          pass_status: grade_value >= passingThreshold ? 'Pass' : 'Fail'
        };
        reportData.subjects[subject_id].total += grade_value;
        reportData.subjects[subject_id].count++;
        reportData.subjects[subject_id].highest = Math.max(reportData.subjects[subject_id].highest, grade_value);
        reportData.subjects[subject_id].lowest = Math.min(reportData.subjects[subject_id].lowest, grade_value);
        
        // Update grade distribution
        gradeDistribution[gradeLetter]++;
        
        // Update overall totals
        totalGradeValue += grade_value;
        totalGradeCount++;
        
        // Calculate weighted grade points if credits are available
        totalGradePoints += (grade_value / 25) * 4 * numericCredits; // Converting to 4.0 GPA scale
        totalCredits += numericCredits;
      });
      
      // Calculate term averages and other stats
      Object.keys(reportData.terms).forEach(term => {
        const termData = reportData.terms[term];
        termData.average = Math.round((termData.total / termData.count) * 10) / 10;
        termData.grade_letter = getGradeLetter(termData.average);
      });
      
      // Calculate subject averages and determine subject status
      Object.keys(reportData.subjects).forEach(subjectId => {
        const subjectData = reportData.subjects[subjectId];
        subjectData.average = Math.round((subjectData.total / subjectData.count) * 10) / 10;
        subjectData.grade_letter = getGradeLetter(subjectData.average);
        
        // Determine if subject is passed overall
        if (subjectData.average >= passingThreshold) {
          subjectData.overall_status = 'Pass';
          passedSubjects++;
        } else {
          subjectData.overall_status = 'Fail';
          failedSubjects++;
        }
      });
      
      // Update overall summary
      reportData.overall_summary.total_subjects = uniqueSubjects.size;
      reportData.overall_summary.average_grade = Math.round((totalGradeValue / totalGradeCount) * 10) / 10;
      reportData.overall_summary.grade_letter = getGradeLetter(reportData.overall_summary.average_grade);
      reportData.overall_summary.passed_subjects = passedSubjects;
      reportData.overall_summary.failed_subjects = failedSubjects;
      reportData.overall_summary.pass_percentage = Math.round((passedSubjects / uniqueSubjects.size) * 100);
      reportData.overall_summary.highest_grade = Math.max(...grades.map(g => g.grade_value));
      reportData.overall_summary.lowest_grade = Math.min(...grades.map(g => g.grade_value));
      reportData.overall_summary.grade_distribution = gradeDistribution;
      
      // Calculate GPA
      if (totalCredits > 0) {
        reportData.overall_summary.total_credits = totalCredits;
        reportData.overall_summary.gpa = Math.round((totalGradePoints / totalCredits) * 100) / 100;
      }
      
      // Determine overall pass/fail status
      reportData.overall_summary.overall_status = failedSubjects === 0 ? 'Pass' : 'Fail';
    }
    
    // Convert objects to arrays for cleaner response
    reportData.terms = Object.keys(reportData.terms).map(term => ({
      term,
      ...reportData.terms[term]
    }));
    
    reportData.subjects = Object.values(reportData.subjects);
    
    res.json(reportData);
  } catch (err) {
    console.error('Error generating grade report:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
