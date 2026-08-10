const Student = require('../models/studentModel');
const cache = require('../utils/cacheManager');
const logger = require('../utils/logger');

class StudentService {
  async getAllStudents(user, filters = {}) {
    try {
      if (!user) {
        logger.warn('StudentService.getAllStudents called without user object');
        return [];
      }

      // Defensive check for role and other properties
      const role = user.role || 'none';
      const schoolId = user.school_id || 'none';
      const garrisonId = user.garrison_id || 'none';

      const cacheKey = `students:role_${role}:school_${schoolId}:garrison_${garrisonId}:filters_${JSON.stringify(filters)}`;

      // 1. Check Cache
      try {
        const cached = await cache.get(cacheKey);
        if (cached) return cached;
      } catch (cacheErr) {
        logger.error('Redis error in StudentService:', cacheErr.message);
      }

      // 2. Get from DB filtered by role and permissions
      let filter = { ...filters };
      const normalizedRole = role.toLowerCase().replace(/_/g, '').replace(/\s/g, '');

      if (normalizedRole === 'superadmin') {
        // SuperAdmins see EVERYTHING
      } else if (normalizedRole === 'garrisondirector' || normalizedRole === 'admin') {
        // Garrison level access
        if (user.garrison_id) filter.garrison_id = user.garrison_id;
      } else if (normalizedRole === 'schooladmin' || user.school_id) {
        // School level access
        if (user.school_id) filter.school_id = user.school_id;
      } else {
        // Restricted access
        return [];
      }

      const students = await Student.getAll(filter);

      // 3. Save to Cache
      try {
        await cache.set(cacheKey, students, 300);
      } catch (cacheErr) {
        // ignore cache write errors
      }

      return students;
    } catch (err) {
      logger.error('Error in getAllStudents service: ' + err.message);
      throw err;
    }
  }

  async getStudentById(id, user = null) {
    try {
      const cacheKey = `student:${id}`;

      // Check Cache
      try {
        const cached = await cache.get(cacheKey);
        if (cached) {
          if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
            if (user.garrison_id && cached.garrison_id !== user.garrison_id) return null;
            if (user.school_id && cached.school_id !== user.school_id) return null;
          }
          return cached;
        }
      } catch (cacheErr) { }

      const results = await Student.getById(id);
      const student = results[0] || null;

      if (!student) return null;

      // Authorization check
      if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
        if (user.garrison_id && student.garrison_id !== user.garrison_id) return null;
        if (user.school_id && student.school_id !== user.school_id) return null;
      }

      // Save to Cache
      try {
        await cache.set(cacheKey, student, 600);
      } catch (cacheErr) { }

      return student;
    } catch (err) {
      logger.error('Error in getStudentById service: ' + err.message);
      throw err;
    }
  }

  async createStudent(studentData) {
    const result = await Student.create(studentData);
    try {
      await cache.del(`students:school_${studentData.school_id || 'all'}`);
    } catch (cacheErr) { }
    return result;
  }

  async updateStudent(id, studentData, user) {
    const existing = await this.getStudentById(id, user);
    if (!existing) {
      const error = new Error('Student not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const result = await Student.update(id, studentData);
    try {
      await cache.del(`student:${id}`);
      await cache.del(`students:school_${studentData.school_id || 'all'}`);
    } catch (cacheErr) { }
    return { id, ...studentData };
  }

  async deleteStudent(id, user) {
    const existing = await this.getStudentById(id, user);
    if (!existing) {
      const error = new Error('Student not found or access denied');
      error.statusCode = 404;
      throw error;
    }

    const result = await Student.delete(id);
    try {
      await cache.del(`student:${id}`);
      await cache.del(`students:school_${user.school_id || 'all'}`);
    } catch (cacheErr) { }
    return { success: true };
  }

  async promoteStudent(id, newClassId) {
    return await Student.promote(id, newClassId);
  }

  async transferStudent(id, school_id, class_id) {
    return await Student.transfer(id, school_id, class_id);
  }

  async getStudentsByClass(class_id) {
    return await Student.getByClass(class_id);
  }

  async getStudentsBySchool(school_id) {
    return await Student.getBySchool(school_id);
  }
}

module.exports = new StudentService();
