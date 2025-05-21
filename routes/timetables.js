// routes/timetables.js
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

// Helper function to check if user can manage section's timetable
const canManageTimetable = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Admin has full access
  if (req.user.role === 'admin') {
    return next();
  }
  
  const { sectionId } = req.params;
  
  try {
    // Check if user is a teacher assigned to this section
    const [sectionTeacher] = await db.promise().query(
      'SELECT id FROM sections WHERE id = ? AND teacher_id = ?',
      [sectionId, req.user.id]
    );
    
    if (sectionTeacher.length > 0) {
      return next();
    }
    
    // If not the section's teacher, reject access
    return res.status(403).json({ 
      error: 'You are not authorized to manage timetable for this section' 
    });
  } catch (err) {
    console.error('Error checking timetable management authorization:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Helper function to validate time format (HH:MM)
 */
const isValidTimeFormat = (timeStr) => {
  if (!timeStr) return false;
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeStr);
};

/**
 * Helper function to check if two time slots overlap
 */
const doTimeSlotsOverlap = (start1, end1, start2, end2) => {
  // Convert time strings to minutes since midnight for easy comparison
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const start1Mins = timeToMinutes(start1);
  const end1Mins = timeToMinutes(end1);
  const start2Mins = timeToMinutes(start2);
  const end2Mins = timeToMinutes(end2);
  
  // Check for overlap
  return (start1Mins < end2Mins && end1Mins > start2Mins);
};

/**
 * Helper function to get day name
 */
const getDayName = (dayNumber) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
};

/**
 * @route   GET /api/timetables/:sectionId/timetable
 * @desc    Get timetable for a section
 * @access  Private (Teachers, Admin)
 */
router.get('/:sectionId/timetable', protect, async (req, res) => {
  const { sectionId } = req.params;
  
  try {
    // Verify section exists
    const [sectionExists] = await db.promise().query(
      `SELECT s.id, s.name, s.teacher_id, c.id as class_id, c.name as class_name, 
              c.grade_level, ay.id as academic_year_id, ay.name as academic_year_name
       FROM sections s
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE s.id = ?`,
      [sectionId]
    );
    
    if (sectionExists.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // If user is not admin or the section's teacher, check authorization
    if (req.user.role !== 'admin' && req.user.id !== sectionExists[0].teacher_id) {
      // Allow teachers to view timetables, but not modify them
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ 
          error: 'You are not authorized to view timetable for this section' 
        });
      }
    }
    
    // Get all timetable entries for this section
    const [schedules] = await db.promise().query(
      `SELECT ts.id, ts.day_of_week, ts.start_time, ts.end_time, ts.subject_id, 
              ts.teacher_id, ts.room_number, ts.term,
              s.name as subject_name, s.code as subject_code,
              u.full_name as teacher_name
       FROM timetable_schedules ts
       LEFT JOIN subjects s ON ts.subject_id = s.id
       LEFT JOIN users u ON ts.teacher_id = u.id
       WHERE ts.section_id = ?
       ORDER BY ts.day_of_week, ts.start_time`,
      [sectionId]
    );
    
    // Organize schedules by day
    const schedulesByDay = Array(7).fill().map(() => []);
    
    schedules.forEach(schedule => {
      // Add day name for easier frontend display
      schedule.day_name = getDayName(schedule.day_of_week);
      schedulesByDay[schedule.day_of_week].push(schedule);
    });
    
    res.json({
      section: sectionExists[0],
      timetable_by_day: schedulesByDay,
      schedules
    });
  } catch (err) {
    console.error('Error fetching section timetable:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   POST /api/timetables/:sectionId/timetable
 * @desc    Create/update timetable for a section
 * @access  Private (Section's teacher, Admin)
 */
router.post('/:sectionId/timetable', protect, canManageTimetable, async (req, res) => {
  const { sectionId } = req.params;
  const { schedules } = req.body;
  
  // Validate required fields
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return res.status(400).json({ 
      error: 'Please provide valid schedules array' 
    });
  }
  
  try {
    // Verify section exists
    const [sectionExists] = await db.promise().query(
      `SELECT s.id, s.teacher_id, c.id as class_id, c.name as class_name,
              c.academic_year_id, ay.name as academic_year_name
       FROM sections s
       JOIN classes c ON s.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE s.id = ?`,
      [sectionId]
    );
    
    if (sectionExists.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // Validate all schedule entries
    const validationErrors = [];
    
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      
      // Validate day_of_week
      if (schedule.day_of_week === undefined || schedule.day_of_week < 0 || schedule.day_of_week > 6) {
        validationErrors.push({
          index: i,
          error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)'
        });
      }
      
      // Validate times
      if (!isValidTimeFormat(schedule.start_time)) {
        validationErrors.push({
          index: i,
          error: 'start_time must be in HH:MM format'
        });
      }
      
      if (!isValidTimeFormat(schedule.end_time)) {
        validationErrors.push({
          index: i,
          error: 'end_time must be in HH:MM format'
        });
      }
      
      // Validate end time is after start time
      if (isValidTimeFormat(schedule.start_time) && 
          isValidTimeFormat(schedule.end_time) &&
          schedule.start_time >= schedule.end_time) {
        validationErrors.push({
          index: i,
          error: 'end_time must be after start_time'
        });
      }
      
      // Validate subject_id
      if (!schedule.subject_id) {
        validationErrors.push({
          index: i,
          error: 'subject_id is required'
        });
      }
      
      // Validate teacher_id
      if (!schedule.teacher_id) {
        validationErrors.push({
          index: i,
          error: 'teacher_id is required'
        });
      }
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid schedule entries',
        validation_errors: validationErrors
      });
    }
    
    // Start transaction
    await db.promise().query('START TRANSACTION');
    
    try {
      // Check for internal conflicts within the submitted schedules
      for (let i = 0; i < schedules.length; i++) {
        const schedule1 = schedules[i];
        
        for (let j = i + 1; j < schedules.length; j++) {
          const schedule2 = schedules[j];
          
          // Skip if different days
          if (schedule1.day_of_week !== schedule2.day_of_week) {
            continue;
          }
          
          // Check for time overlap
          if (doTimeSlotsOverlap(
              schedule1.start_time, schedule1.end_time,
              schedule2.start_time, schedule2.end_time
          )) {
            await db.promise().query('ROLLBACK');
            return res.status(400).json({
              error: 'Schedule conflict detected',
              conflict: {
                schedule1: {
                  day: getDayName(schedule1.day_of_week),
                  time: `${schedule1.start_time} - ${schedule1.end_time}`
                },
                schedule2: {
                  day: getDayName(schedule2.day_of_week),
                  time: `${schedule2.start_time} - ${schedule2.end_time}`
                }
              }
            });
          }
        }
      }
      
      // Check for teacher conflicts with existing schedules
      for (const schedule of schedules) {
        const [teacherConflicts] = await db.promise().query(
          `SELECT ts.id, ts.start_time, ts.end_time, ts.day_of_week,
                  s.name as section_name, c.name as class_name,
                  sub.name as subject_name
           FROM timetable_schedules ts
           JOIN sections s ON ts.section_id = s.id
           JOIN classes c ON s.class_id = c.id
           JOIN subjects sub ON ts.subject_id = sub.id
           WHERE ts.teacher_id = ?
           AND ts.day_of_week = ?
           AND ts.section_id != ?
           AND ((ts.start_time < ? AND ts.end_time > ?) OR
                (ts.start_time >= ? AND ts.start_time < ?))`,
          [
            schedule.teacher_id,
            schedule.day_of_week,
            sectionId,
            schedule.end_time,
            schedule.start_time,
            schedule.start_time,
            schedule.end_time
          ]
        );
        
        if (teacherConflicts.length > 0) {
          await db.promise().query('ROLLBACK');
          return res.status(400).json({
            error: 'Teacher scheduling conflict detected',
            conflict: {
              teacher_id: schedule.teacher_id,
              day: getDayName(schedule.day_of_week),
              time: `${schedule.start_time} - ${schedule.end_time}`,
              existing_schedule: teacherConflicts[0]
            }
          });
        }
      }
      
      // Delete existing schedules for this section
      await db.promise().query(
        'DELETE FROM timetable_schedules WHERE section_id = ?',
        [sectionId]
      );
      
      // Insert new schedules
      for (const schedule of schedules) {
        await db.promise().query(
          `INSERT INTO timetable_schedules 
           (section_id, day_of_week, start_time, end_time, subject_id, teacher_id, room_number, term)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sectionId,
            schedule.day_of_week,
            schedule.start_time,
            schedule.end_time,
            schedule.subject_id,
            schedule.teacher_id,
            schedule.room_number || null,
            schedule.term || null
          ]
        );
      }
      
      await db.promise().query('COMMIT');
      
      res.status(201).json({
        message: 'Timetable updated successfully',
        schedule_count: schedules.length
      });
    } catch (err) {
      await db.promise().query('ROLLBACK');
      console.error('Error updating timetable:', err);
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error('Error processing timetable update:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/timetables/teacher/:teacherId/schedule
 * @desc    Get teacher's schedule
 * @access  Private (Teacher themselves, Admin)
 */
router.get('/teacher/:teacherId/schedule', protect, async (req, res) => {
  const { teacherId } = req.params;
  
  // Authorize access (only admin or the teacher themselves)
  if (req.user.role !== 'admin' && req.user.id !== parseInt(teacherId)) {
    return res.status(403).json({ 
      error: 'You are not authorized to view this teacher\'s schedule' 
    });
  }
  
  try {
    // Verify teacher exists
    const [teacherExists] = await db.promise().query(
      `SELECT u.id, u.full_name, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'teacher'`,
      [teacherId]
    );
    
    if (teacherExists.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    // Get all schedules for this teacher across all sections
    const [schedules] = await db.promise().query(
      `SELECT ts.id, ts.section_id, ts.day_of_week, ts.start_time, ts.end_time, 
              ts.subject_id, ts.room_number, ts.term,
              s.name as section_name, 
              c.name as class_name, c.grade_level,
              sub.name as subject_name, sub.code as subject_code,
              ay.name as academic_year_name
       FROM timetable_schedules ts
       JOIN sections s ON ts.section_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN subjects sub ON ts.subject_id = sub.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE ts.teacher_id = ?
       ORDER BY ts.day_of_week, ts.start_time`,
      [teacherId]
    );
    
    // Organize schedules by day for easier frontend consumption
    const weeklySchedule = Array(7).fill().map(() => []);
    
    schedules.forEach(schedule => {
      // Add day name for easier reference
      schedule.day_name = getDayName(schedule.day_of_week);
      weeklySchedule[schedule.day_of_week].push(schedule);
    });
    
    // Check for overlapping schedules (conflicts)
    const conflicts = [];
    
    for (let day = 0; day < 7; day++) {
      const daySchedules = weeklySchedule[day];
      
      for (let i = 0; i < daySchedules.length; i++) {
        for (let j = i + 1; j < daySchedules.length; j++) {
          const schedule1 = daySchedules[i];
          const schedule2 = daySchedules[j];
          
          if (doTimeSlotsOverlap(
              schedule1.start_time, schedule1.end_time,
              schedule2.start_time, schedule2.end_time
          )) {
            conflicts.push({
              day: getDayName(day),
              conflict_type: 'time_overlap',
              schedule1: {
                id: schedule1.id,
                time: `${schedule1.start_time} - ${schedule1.end_time}`,
                section: schedule1.section_name,
                subject: schedule1.subject_name
              },
              schedule2: {
                id: schedule2.id,
                time: `${schedule2.start_time} - ${schedule2.end_time}`,
                section: schedule2.section_name,
                subject: schedule2.subject_name
              }
            });
          }
        }
      }
    }
    
    // Add subjects taught by this teacher
    const [taughtSubjects] = await db.promise().query(
      `SELECT DISTINCT s.id, s.name, s.code
       FROM subjects s
       JOIN teacher_subjects ts ON s.id = ts.subject_id
       WHERE ts.teacher_id = ?
       ORDER BY s.name`,
      [teacherId]
    );
    
    res.json({
      teacher: teacherExists[0],
      weekly_schedule: weeklySchedule,
      schedules,
      conflicts: conflicts.length > 0 ? conflicts : null,
      has_conflicts: conflicts.length > 0,
      taught_subjects: taughtSubjects
    });
  } catch (err) {
    console.error('Error fetching teacher schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /api/timetables/conflicts
 * @desc    Check for scheduling conflicts
 * @access  Private (Admin only)
 */
router.get('/conflicts', protect, isAdmin, async (req, res) => {
  try {
    // Check for teacher conflicts (same teacher scheduled at overlapping times)
    const [teacherConflicts] = await db.promise().query(
      `SELECT 
        ts1.id as schedule1_id, 
        ts1.day_of_week,
        ts1.start_time as s1_start,
        ts1.end_time as s1_end,
        ts2.id as schedule2_id,
        ts2.start_time as s2_start,
        ts2.end_time as s2_end,
        u.id as teacher_id,
        u.full_name as teacher_name,
        sec1.name as section1_name,
        sec2.name as section2_name,
        sub1.name as subject1_name,
        sub2.name as subject2_name
      FROM timetable_schedules ts1
      JOIN timetable_schedules ts2 ON ts1.teacher_id = ts2.teacher_id
                                  AND ts1.day_of_week = ts2.day_of_week
                                  AND ts1.id < ts2.id
      JOIN users u ON ts1.teacher_id = u.id
      JOIN sections sec1 ON ts1.section_id = sec1.id
      JOIN sections sec2 ON ts2.section_id = sec2.id
      JOIN subjects sub1 ON ts1.subject_id = sub1.id
      JOIN subjects sub2 ON ts2.subject_id = sub2.id
      WHERE 
        /* Check for overlapping time slots */
        ((ts1.start_time < ts2.end_time AND ts1.end_time > ts2.start_time)
        OR
        (ts2.start_time < ts1.end_time AND ts2.end_time > ts1.start_time))
      ORDER BY ts1.day_of_week, ts1.start_time`
    );
    
    // Check for room conflicts (same room scheduled at overlapping times)
    const [roomConflicts] = await db.promise().query(
      `SELECT 
        ts1.id as schedule1_id, 
        ts1.day_of_week,
        ts1.room_number,
        ts1.start_time as s1_start,
        ts1.end_time as s1_end,
        ts2.id as schedule2_id,
        ts2.start_time as s2_start,
        ts2.end_time as s2_end,
        sec1.name as section1_name,
        sec2.name as section2_name,
        sub1.name as subject1_name,
        sub2.name as subject2_name
      FROM timetable_schedules ts1
      JOIN timetable_schedules ts2 ON ts1.room_number = ts2.room_number
                                  AND ts1.day_of_week = ts2.day_of_week
                                  AND ts1.id < ts2.id
      JOIN sections sec1 ON ts1.section_id = sec1.id
      JOIN sections sec2 ON ts2.section_id = sec2.id
      JOIN subjects sub1 ON ts1.subject_id = sub1.id
      JOIN subjects sub2 ON ts2.subject_id = sub2.id
      WHERE 
        /* Only consider schedules with room numbers */
        ts1.room_number IS NOT NULL AND ts2.room_number IS NOT NULL
        /* Check for overlapping time slots */
        AND ((ts1.start_time < ts2.end_time AND ts1.end_time > ts2.start_time)
        OR
        (ts2.start_time < ts1.end_time AND ts2.end_time > ts1.start_time))
      ORDER BY ts1.day_of_week, ts1.room_number, ts1.start_time`
    );
    
    // Check for section conflicts (same section scheduled at overlapping times)
    const [sectionConflicts] = await db.promise().query(
      `SELECT 
        ts1.id as schedule1_id, 
        ts1.day_of_week,
        ts1.start_time as s1_start,
        ts1.end_time as s1_end,
        ts2.id as schedule2_id,
        ts2.start_time as s2_start,
        ts2.end_time as s2_end,
        sec.name as section_name,
        sub1.name as subject1_name,
        sub2.name as subject2_name,
        u1.full_name as teacher1_name,
        u2.full_name as teacher2_name
      FROM timetable_schedules ts1
      JOIN timetable_schedules ts2 ON ts1.section_id = ts2.section_id
                                  AND ts1.day_of_week = ts2.day_of_week
                                  AND ts1.id < ts2.id
      JOIN sections sec ON ts1.section_id = sec.id
      JOIN subjects sub1 ON ts1.subject_id = sub1.id
      JOIN subjects sub2 ON ts2.subject_id = sub2.id
      JOIN users u1 ON ts1.teacher_id = u1.id
      JOIN users u2 ON ts2.teacher_id = u2.id
      WHERE 
        /* Check for overlapping time slots */
        ((ts1.start_time < ts2.end_time AND ts1.end_time > ts2.start_time)
        OR
        (ts2.start_time < ts1.end_time AND ts2.end_time > ts1.start_time))
      ORDER BY ts1.day_of_week, sec.name, ts1.start_time`
    );
    
    // Format all conflicts for better readability
    const formattedTeacherConflicts = teacherConflicts.map(conflict => ({
      conflict_type: 'teacher',
      teacher: {
        id: conflict.teacher_id,
        name: conflict.teacher_name
      },
      day: getDayName(conflict.day_of_week),
      schedule1: {
        id: conflict.schedule1_id,
        section: conflict.section1_name,
        subject: conflict.subject1_name,
        time: `${conflict.s1_start} - ${conflict.s1_end}`
      },
      schedule2: {
        id: conflict.schedule2_id,
        section: conflict.section2_name,
        subject: conflict.subject2_name,
        time: `${conflict.s2_start} - ${conflict.s2_end}`
      }
    }));
    
    const formattedRoomConflicts = roomConflicts.map(conflict => ({
      conflict_type: 'room',
      room: conflict.room_number,
      day: getDayName(conflict.day_of_week),
      schedule1: {
        id: conflict.schedule1_id,
        section: conflict.section1_name,
        subject: conflict.subject1_name,
        time: `${conflict.s1_start} - ${conflict.s1_end}`
      },
      schedule2: {
        id: conflict.schedule2_id,
        section: conflict.section2_name,
        subject: conflict.subject2_name,
        time: `${conflict.s2_start} - ${conflict.s2_end}`
      }
    }));
    
    const formattedSectionConflicts = sectionConflicts.map(conflict => ({
      conflict_type: 'section',
      section: conflict.section_name,
      day: getDayName(conflict.day_of_week),
      schedule1: {
        id: conflict.schedule1_id,
        subject: conflict.subject1_name,
        teacher: conflict.teacher1_name,
        time: `${conflict.s1_start} - ${conflict.s1_end}`
      },
      schedule2: {
        id: conflict.schedule2_id,
        subject: conflict.subject2_name,
        teacher: conflict.teacher2_name,
        time: `${conflict.s2_start} - ${conflict.s2_end}`
      }
    }));
    
    // Combine all conflicts
    const allConflicts = [
      ...formattedTeacherConflicts,
      ...formattedRoomConflicts,
      ...formattedSectionConflicts
    ];
    
    res.json({
      total_conflicts: allConflicts.length,
      teacher_conflicts: {
        count: formattedTeacherConflicts.length,
        conflicts: formattedTeacherConflicts
      },
      room_conflicts: {
        count: formattedRoomConflicts.length,
        conflicts: formattedRoomConflicts
      },
      section_conflicts: {
        count: formattedSectionConflicts.length,
        conflicts: formattedSectionConflicts
      },
      all_conflicts: allConflicts
    });
  } catch (err) {
    console.error('Error checking for scheduling conflicts:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /api/timetables/:sectionId/timetable/:scheduleId
 * @desc    Update a specific timetable entry
