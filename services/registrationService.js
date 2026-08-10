const db = require("../config/db");
const crypto = require("crypto");
const { logAction } = require("../utils/auditLogger");
const logger = require("../utils/logger");
const cache = require("../utils/cacheManager");
const queue = require("../utils/queueManager");

/**
 * Registration Service
 * Handles business logic and database interactions for registrations
 */
class RegistrationService {
  /**
   * Get all registrations
   * Professional Note: Implements Tenant-aware caching
   */
  async getAllRegistrations(user) {
    try {
      if (!user) return [];

      const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
      const cacheKey = `registrations:role_${normalizedRole}:school_${user.school_id || 'none'}:garrison_${user.garrison_id || 'none'}`;

      // 1. Try to get from Cache
      try {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) return cachedData;
      } catch (e) {
        logger.error('Redis error in getAllRegistrations:', e.message);
      }

      // Professional SaaS Note: Filter by school_id or garrison_id based on role
      let query;
      let params = [];

      if (normalizedRole === 'superadmin') {
        // SuperAdmins see EVERYTHING
        query = "SELECT * FROM registrations";
      } else if (normalizedRole === 'garrisondirector' || normalizedRole === 'admin') {
        // Garrison Directors or Garrison-level Admins see everything in their garrison
        query = "SELECT * FROM registrations WHERE garrison_id = ?";
        params = [user.garrison_id];
      } else if (normalizedRole === 'schooladmin' || user.school_id) {
        // School-level Admins/Users see only their school
        query = "SELECT * FROM registrations WHERE school_id = ?";
        params = [user.school_id];
      } else {
        return [];
      }

      const [results] = await db.query(query, params);

      // 3. Save to Cache
      try {
        await cache.set(cacheKey, results, 600);
      } catch (e) { }

      return results;
    } catch (err) {
      logger.error('Error in getAllRegistrations service: ' + err.message);
      throw err;
    }
  }

  /**
   * Create a new registration
   */
  async createRegistration(registrationData, user) {
    try {
      const {
        first_name, middle_name, last_name, category, date_of_birth,
        class_applying_for, gender, email, phone_number, address,
        previous_school, guardian_name, relationship, guardian_phone_number,
        academic_year_id, status = "pending", scores = 0
      } = registrationData;

      // 1. Verify academic year
      const [[{ count }]] = await db.query(
        "SELECT COUNT(*) as count FROM academic_years WHERE id = ?",
        [academic_year_id]
      );

      if (count === 0) {
        const error = new Error("Invalid academic_year_id.");
        error.statusCode = 400;
        throw error;
      }

      // 2. Prepare data
      const id = crypto.randomUUID();
      const { school_id, garrison_id, id: userId } = user;

      const record = {
        id,
        school_id: school_id || null,
        garrison_id: garrison_id || null,
        student_id: (registrationData.student_id && registrationData.student_id !== 0) ? registrationData.student_id : null,
        first_name,
        middle_name: middle_name || null,
        last_name,
        category,
        date_of_birth,
        class_applying_for,
        gender,
        email: email || null,
        phone_number: phone_number || null,
        address,
        previous_school: previous_school || null,
        guardian_name,
        relationship,
        guardian_phone_number,
        academic_year_id,
        status: status || "pending",
        scores: scores
      };

      // 3. Save to DB
      const sql = `
        INSERT INTO registrations
        (id, school_id, garrison_id, student_id, first_name, middle_name, last_name, category, date_of_birth, class_applying_for, gender, email, phone_number, address, previous_school, guardian_name, relationship, guardian_phone_number, academic_year_id, status, scores)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        record.id, record.school_id, record.garrison_id, record.student_id,
        record.first_name, record.middle_name, record.last_name, record.category,
        record.date_of_birth, record.class_applying_for, record.gender,
        record.email, record.phone_number, record.address, record.previous_school,
        record.guardian_name, record.relationship, record.guardian_phone_number,
        record.academic_year_id, record.status, record.scores
      ];

      await db.query(sql, values);

      try {
        await cache.del(`registrations:school_${school_id || 'all'}`);
      } catch (e) { }

      // 4. Audit Log
      await logAction({
        userId,
        action: 'CREATE',
        resourceType: 'REGISTRATION',
        resourceId: id,
        schoolId: school_id,
        garrisonId: garrison_id,
        details: { first_name, last_name, status: record.status }
      });

      // 5. Trigger Background Job: Welcome Email
      if (record.email) {
        try {
          await queue.addJob('EMAIL_WELCOME', {
            email: record.email,
            name: `${record.first_name} ${record.last_name}`
          });
        } catch (e) { }
      }

      return record;
    } catch (err) {
      logger.error('Error in createRegistration service: ' + err.message);
      throw err;
    }
  }

  /**
   * Get registration by ID
   */
  async getRegistrationById(id, user = null) {
    try {
      let query = "SELECT * FROM registrations WHERE id = ?";
      let params = [id];

      if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
        if (user.garrison_id) {
          query += " AND garrison_id = ?";
          params.push(user.garrison_id);
        }
      }

      const [results] = await db.query(query, params);
      return results[0] || null;
    } catch (err) {
      logger.error('Error in getRegistrationById service: ' + err.message);
      throw err;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(id, userId, schoolId, garrisonId) {
    try {
      const [result] = await db.query(
        'UPDATE registrations SET payment_status = ? WHERE id = ?',
        ['paid', id]
      );

      if (result.affectedRows > 0) {
        try {
          await cache.del(`registrations:school_${schoolId || 'all'}`);
        } catch (e) { }

        await logAction({
          userId,
          action: 'UPDATE',
          resourceType: 'REGISTRATION',
          resourceId: id,
          schoolId,
          garrisonId,
          details: { payment_status: 'paid' }
        });
      }

      return result.affectedRows > 0;
    } catch (err) {
      logger.error('Error in updatePaymentStatus service: ' + err.message);
      throw err;
    }
  }

  /**
   * Update registration
   */
  async updateRegistration(id, updateData, user) {
    try {
      const existing = await this.getRegistrationById(id, user);
      if (!existing) return false;

      const fields = [];
      const values = [];

      const allowedFields = [
        'first_name', 'middle_name', 'last_name', 'category', 'date_of_birth',
        'class_applying_for', 'gender', 'email', 'phone_number', 'address',
        'previous_school', 'guardian_name', 'relationship', 'guardian_phone_number',
        'academic_year_id', 'scores', 'status', 'payment_status', 'payment_type'
      ];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (fields.length === 0) return true;

      const sql = `UPDATE registrations SET ${fields.join(', ')} WHERE id = ?`;
      values.push(id);

      const [result] = await db.query(sql, values);

      if (result.affectedRows === 0) {
        const [exists] = await db.query("SELECT id FROM registrations WHERE id = ?", [id]);
        if (exists.length === 0) return false;
        return true;
      }

      try {
        await cache.del(`registrations:school_${user.school_id || 'all'}`);
        await cache.del(`registrations:role_${user.role}:school_${user.school_id || 'none'}:garrison_${user.garrison_id || 'none'}`);
      } catch (e) { }

      await logAction({
        userId: user.id,
        action: 'UPDATE',
        resourceType: 'REGISTRATION',
        resourceId: id,
        schoolId: user.school_id,
        garrisonId: user.garrison_id,
        details: updateData
      });

      return true;
    } catch (err) {
      logger.error('Error in updateRegistration service: ' + err.message);
      throw err;
    }
  }

  /**
   * Delete registration
   */
  async deleteRegistration(id, user) {
    try {
      const existing = await this.getRegistrationById(id, user);
      if (!existing) return false;

      const [result] = await db.query("DELETE FROM registrations WHERE id = ?", [id]);

      if (result.affectedRows > 0) {
        try {
          await cache.del(`registrations:school_${user.school_id || 'all'}`);
        } catch (e) { }

        await logAction({
          userId: user.id,
          action: 'DELETE',
          resourceType: 'REGISTRATION',
          resourceId: id,
          schoolId: user.school_id,
          garrisonId: user.garrison_id
        });
      }

      return result.affectedRows > 0;
    } catch (err) {
      logger.error('Error in deleteRegistration service: ' + err.message);
      throw err;
    }
  }
}

module.exports = new RegistrationService();
