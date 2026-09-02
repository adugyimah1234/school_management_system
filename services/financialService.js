const db = require("../config/db");
const crypto = require("crypto");
const { logAction } = require("../utils/auditLogger");
const logger = require("../utils/logger");
const cache = require("../utils/cacheManager");
const dashboardService = require("./dashboardService");
const queue = require("../utils/queueManager");
const studentService = require("./studentService");

class FinancialService {
  /**
   * --- Fee Structure Methods ---
   */

  async getFeeById(id) {
    try {
      const cacheKey = `fee:${id}`;
      try {
        const cached = await cache.get(cacheKey);
        if (cached) return cached;
      } catch (e) { }

      const [fees] = await db.query(
        `SELECT f.*, c.name as category_name, ay.year as academic_year
         FROM fees f
         LEFT JOIN categories c ON f.category_id = c.id
         LEFT JOIN academic_years ay ON f.academic_year_id = ay.id
         WHERE f.id = ?`,
        [id]
      );
      const fee = fees[0] || null;
      if (fee) {
        try {
          await cache.set(cacheKey, fee, 3600);
        } catch (e) { }
      }
      return fee;
    } catch (err) {
      logger.error('Error in getFeeById service: ' + err.message);
      throw err;
    }
  }

  async getAllFees(filters = {}, user = null) {
    try {
      const { school_id, fee_type } = filters;
      const cacheKey = `fees:school_${school_id || 'all'}:type_${fee_type || 'all'}:user_${user?.id || 'none'}`;

      try {
        const cached = await cache.get(cacheKey);
        if (cached) return cached;
      } catch (e) { }

      let query = `
        SELECT f.*, c.name as category_name, cl.name as class_name, s.name as school_name, ay.year as academic_year
        FROM fees f
        JOIN categories c ON f.category_id = c.id
        JOIN classes cl ON f.class_id = cl.id
        LEFT JOIN schools s ON f.school_id = s.id
        LEFT JOIN academic_years ay ON f.academic_year_id = ay.id
      `;

      const queryParams = [];
      const whereConditions = [];

      if (school_id) {
        whereConditions.push('f.school_id = ?');
        queryParams.push(school_id);
      } else if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
        const role = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        if (role === 'garrisondirector' || role === 'admin') {
          whereConditions.push('f.garrison_id = ?');
          queryParams.push(user.garrison_id);
        } else if (role === 'schooladmin' || user.school_id) {
          whereConditions.push('(f.school_id = ? OR (f.garrison_id = ? AND f.school_id IS NULL))');
          queryParams.push(user.school_id, user.garrison_id);
        }
      }

      if (fee_type) {
        whereConditions.push('f.fee_type = ?');
        queryParams.push(fee_type);
      }

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      query += ' ORDER BY cl.grade_level, c.name';

      const [fees] = await db.query(query, queryParams);
      try {
        await cache.set(cacheKey, fees, 1800); // 30 mins
      } catch (e) { }
      return fees;
    } catch (err) {
      logger.error('Error in getAllFees service: ' + err.message);
      throw err;
    }
  }

  async createFee(feeData, user) {
    try {
      const {
        category_id, class_id, fee_type, amount,
        description, effective_date, academic_year_id
      } = feeData;

      let school_id = user.school_id;
      let garrison_id = user.garrison_id;
      const role = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

      if (role === 'garrisondirector' || role === 'admin') {
        school_id = feeData.school_id || null;
      } else if (role === 'schooladmin') {
        school_id = user.school_id;
      }

      const [existing] = await db.query(
        `SELECT id FROM fees
         WHERE category_id = ? AND class_id = ? AND fee_type = ? AND academic_year_id = ?
         AND (school_id = ? OR (school_id IS NULL AND garrison_id = ?))`,
        [category_id, class_id, fee_type, academic_year_id, school_id, garrison_id]
      );

      if (existing.length > 0) {
        const error = new Error('Fee structure already exists for this criteria');
        error.statusCode = 400;
        throw error;
      }

      const id = crypto.randomUUID();
      await db.query(
        `INSERT INTO fees
         (id, category_id, class_id, fee_type, amount, description, effective_date, school_id, garrison_id, academic_year_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, category_id, class_id, fee_type, amount, description, effective_date || new Date(), school_id, garrison_id, academic_year_id]
      );

      try {
        await cache.delByPattern(`fees:*`);
      } catch (e) { }

      await logAction({
        userId: user.id,
        action: 'CREATE',
        resourceType: 'FEE_STRUCTURE',
        resourceId: id,
        schoolId: school_id,
        garrisonId: garrison_id,
        details: { fee_type, amount }
      });

      return { id, ...feeData, school_id, garrison_id };
    } catch (err) {
      logger.error('Error in createFee service: ' + err.message);
      throw err;
    }
  }

  async updateFee(id, feeData, user) {
    try {
      const { amount, category_id, academic_year_id, description } = feeData;

      const [result] = await db.query(
        'UPDATE fees SET amount = ?, category_id = ?, academic_year_id = ?, description = ? WHERE id = ?',
        [amount, category_id, academic_year_id, description, id]
      );

      if (result.affectedRows === 0) {
        const error = new Error('Fee not found');
        error.statusCode = 404;
        throw error;
      }

      await logAction({
        userId: user.id,
        action: 'UPDATE',
        resourceType: 'FEE_STRUCTURE',
        resourceId: id,
        schoolId: user.school_id,
        details: { amount }
      });

      return true;
    } catch (err) {
      logger.error('Error in updateFee service: ' + err.message);
      throw err;
    }
  }

  async deleteFee(id, user) {
    try {
      const [result] = await db.query('DELETE FROM fees WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        const error = new Error('Fee not found');
        error.statusCode = 404;
        throw error;
      }

      await logAction({
        userId: user.id,
        action: 'DELETE',
        resourceType: 'FEE_STRUCTURE',
        resourceId: id,
        schoolId: user.school_id
      });

      return true;
    } catch (err) {
      logger.error('Error in deleteFee service: ' + err.message);
      throw err;
    }
  }

  async getAllPayments(filters = {}, user = null) {
    try {
      const { student_id, fee_id, school_id } = filters;

      let query = `
        SELECT p.*,
               CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
               f.fee_type, f.amount as fee_amount,
               u.full_name as recorded_by_name,
               sch.name as school_name
        FROM payments p
        JOIN students s ON p.student_id = s.id
        JOIN fees f ON p.fee_id = f.id
        LEFT JOIN users u ON p.recorded_by = u.id
        LEFT JOIN schools sch ON p.school_id = sch.id
      `;

      const queryParams = [];
      const whereConditions = [];

      if (student_id) { whereConditions.push('p.student_id = ?'); queryParams.push(student_id); }
      if (fee_id) { whereConditions.push('p.fee_id = ?'); queryParams.push(fee_id); }

      if (school_id) {
        whereConditions.push('p.school_id = ?');
        queryParams.push(school_id);
      } else if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
        const role = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        if (role === 'garrisondirector' || role === 'admin') {
          // Garrison level view
          if (user.garrison_id) {
            whereConditions.push('p.garrison_id = ?');
            queryParams.push(user.garrison_id);
          }
        } else {
          // School level or restricted
          if (user.school_id) {
            whereConditions.push('p.school_id = ?');
            queryParams.push(user.school_id);
          } else if (user.garrison_id) {
            whereConditions.push('p.garrison_id = ?');
            queryParams.push(user.garrison_id);
          }
        }
      }

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      query += ' ORDER BY p.payment_date DESC';

      const [payments] = await db.query(query, queryParams);
      return payments;
    } catch (err) {
      logger.error('Error in getAllPayments service: ' + err.message);
      throw err;
    }
  }

  async getPaymentById(id) {
    try {
      const [results] = await db.query(
        `SELECT p.*,
               CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
               f.fee_type, f.amount as fee_amount
         FROM payments p
         JOIN students s ON p.student_id = s.id
         JOIN fees f ON p.fee_id = f.id
         WHERE p.id = ?`,
        [id]
      );
      return results[0] || null;
    } catch (err) {
      logger.error('Error in getPaymentById service: ' + err.message);
      throw err;
    }
  }

  async recordPayment(paymentData, user) {
    try {
      const { student_id, fee_id, amount_paid, payment_date, payment_method = 'cash' } = paymentData;
      const school_id = user.school_id;
      const garrison_id = user.garrison_id;

      const [[fee]] = await db.query('SELECT amount, fee_type FROM fees WHERE id = ?', [fee_id]);
      if (!fee) throw new Error('Fee structure not found');

      const [[paymentTotal]] = await db.query(
        'SELECT SUM(amount_paid) as total FROM payments WHERE student_id = ? AND fee_id = ?',
        [student_id, fee_id]
      );

      const currentTotal = parseFloat(paymentTotal.total || 0);
      const balance = parseFloat(fee.amount) - currentTotal;

      if (parseFloat(amount_paid) > balance) {
        const error = new Error(`Payment exceeds balance. Remaining: ${balance}`);
        error.statusCode = 400;
        throw error;
      }

      const paymentId = crypto.randomUUID();
      await db.query(
        `INSERT INTO payments
         (id, student_id, fee_id, amount_paid, payment_date, method, recorded_by, school_id, garrison_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [paymentId, student_id, fee_id, amount_paid, payment_date || new Date(), payment_method, user.id, school_id, garrison_id]
      );

      const isFullyPaid = (currentTotal + parseFloat(amount_paid)) >= parseFloat(fee.amount);

      try {
        await dashboardService.invalidateDashboardCache(school_id);
      } catch (e) { }

      await logAction({
        userId: user.id,
        action: 'CREATE',
        resourceType: 'PAYMENT',
        resourceId: paymentId,
        schoolId: school_id,
        details: { student_id, amount_paid, isFullyPaid }
      });

      try {
        const student = await studentService.getStudentById(student_id);
        if (student && (student.phone_number || student.guardian_phone_number)) {
          await queue.addJob('SMS_PAYMENT', {
            phone: student.phone_number || student.guardian_phone_number,
            amount: amount_paid,
            balance: balance - amount_paid
          });
        }
      } catch (err) {
        logger.warn(`Could not queue SMS: ${err.message}`);
      }

      return { paymentId, isFullyPaid, remaining_balance: balance - amount_paid };
    } catch (err) {
      logger.error('Error in recordPayment service: ' + err.message);
      throw err;
    }
  }

  async getStudentFinancialSummary(studentId) {
    try {
      const [fees] = await db.query(`
        SELECT f.id, f.fee_type, f.amount as total_fee,
               COALESCE(SUM(p.amount_paid), 0) as total_paid,
               (f.amount - COALESCE(SUM(p.amount_paid), 0)) as balance
        FROM fees f
        JOIN students s ON f.class_id = s.class_id AND f.category_id = s.category_id
        LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = s.id
        WHERE s.id = ?
        GROUP BY f.id
      `, [studentId]);

      return fees;
    } catch (err) {
      logger.error('Error in getStudentFinancialSummary service: ' + err.message);
      throw err;
    }
  }

  async getDebtLedger(user) {
    try {
      const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
      let query = `
        SELECT
            s.id,
            s.first_name,
            s.last_name,
            p.full_name as guardian_name,
            p.phone_number as guardian_phone_number,
            c.name as class_name,
            sch.name as school_name,
            (
                SELECT COALESCE(SUM(f.amount), 0)
                FROM fees f
                WHERE (f.class_id = s.class_id AND f.category_id = s.category_id)
                AND (f.school_id = s.school_id OR (f.school_id IS NULL AND f.garrison_id = s.garrison_id))
            ) as total_fees,
            (
                SELECT COALESCE(SUM(p.amount_paid), 0)
                FROM payments p
                WHERE p.student_id = s.id
            ) as total_paid
        FROM students s
        JOIN classes c ON s.class_id = c.id
        JOIN schools sch ON s.school_id = sch.id
        LEFT JOIN parents p ON s.id = p.student_id
        WHERE s.status = 'active'
      `;

      let params = [];
      if (normalizedRole === 'superadmin') {
        // No filter
      } else if (normalizedRole === 'garrisondirector' || normalizedRole === 'admin') {
        query += " AND s.garrison_id = ?";
        params = [user.garrison_id];
      } else {
        query += " AND s.school_id = ?";
        params = [user.school_id];
      }

      const [rows] = await db.query(query, params);

      return rows.map(r => ({
          ...r,
          total_fees: parseFloat(r.total_fees),
          total_paid: parseFloat(r.total_paid),
          balance: parseFloat(r.total_fees) - parseFloat(r.total_paid)
      })).filter(r => r.balance > 0);
    } catch (err) {
      logger.error('Error in getDebtLedger service: ' + err.message);
      throw err;
    }
  }

  async sendBulkDebtReminder(studentIds, user) {
    const commService = require('./communicationService');
    let successCount = 0;

    for (const id of studentIds) {
      try {
        const [student] = await db.query(`
          SELECT s.*,
            (SELECT COALESCE(SUM(amount), 0) FROM fees WHERE class_id = s.class_id AND category_id = s.category_id) -
            (SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE student_id = s.id) as balance
          FROM students s WHERE s.id = ?
        `, [id]);

        if (student[0] && student[0].balance > 0 && student[0].guardian_phone_number) {
            const msg = `GARRISON FINANCE: Dear Guardian, your ward ${student[0].first_name} has an outstanding balance of GHS ${parseFloat(student[0].balance).toFixed(2)}. Please settle this at the school office to avoid service interruption.`;
            await commService.sendSMS(student[0].guardian_phone_number, msg);
            successCount++;
        }
      } catch (e) { }
    }
    return { success: true, count: successCount };
  }
}

module.exports = new FinancialService();
