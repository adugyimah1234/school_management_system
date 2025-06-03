const db = require('../config/db');
const { promisify } = require('util');

// Convert db.query to support promises
const queryAsync = promisify(db.query).bind(db);

// Valid fee types
const FEE_TYPES = ['registration', 'admission', 'tuition', 'exam', 'other'];

/**
 * Validates fee data
 * @param {Object} data - Fee data to validate
 * @returns {Object} - Object with isValid boolean and errors array
 */
const validateFeeData = (data) => {
  const errors = [];
  
  // Check required fields
  if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
    errors.push('Valid amount is required');
  }
  
  if (!data.category_id) {
    errors.push('Category ID is required');
  }
  
  if (!data.class_id) {
    errors.push('Class ID is required');
  }
  
  if (!data.fee_type || !FEE_TYPES.includes(data.fee_type)) {
    errors.push(`Fee type must be one of: ${FEE_TYPES.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const Fee = {
  /**
   * Get all fees with optional filters
   * @param {Object} filters - Optional filters (school_id, fee_type, class_id, category_id)
   * @param {Function} callback - Callback function
   */
  getAll: (filters = {}, callback) => {
    let query = `
      SELECT f.*, c.name as category_name, cl.name as class_name, s.name as school_name
      FROM fees f
      JOIN categories c ON f.category_id = c.id
      JOIN classes cl ON f.class_id = cl.id
      LEFT JOIN schools s ON f.school_id = s.id
    `;
    
    const queryParams = [];
    const whereConditions = [];
    
    // Add filters if provided
    if (filters.school_id) {
      whereConditions.push('f.school_id = ?');
      queryParams.push(filters.school_id);
    }
    
    if (filters.fee_type) {
      whereConditions.push('f.fee_type = ?');
      queryParams.push(filters.fee_type);
    }
    
    if (filters.class_id) {
      whereConditions.push('f.class_id = ?');
      queryParams.push(filters.class_id);
    }
    
    if (filters.category_id) {
      whereConditions.push('f.category_id = ?');
      queryParams.push(filters.category_id);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    query += ' ORDER BY c.name, cl.grade_level';
    
    db.query(query, queryParams, callback);
  },
  
  /**
   * Get all fees with promise support
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Promise resolving to fees array
   */
  getAllAsync: async (filters = {}) => {
    let query = `
      SELECT f.*, c.name as category_name, cl.name as class_name, s.name as school_name
      FROM fees f
      JOIN categories c ON f.category_id = c.id
      JOIN classes cl ON f.class_id = cl.id
      LEFT JOIN schools s ON f.school_id = s.id
    `;
    
    const queryParams = [];
    const whereConditions = [];
    
    // Add filters if provided
    if (filters.school_id) {
      whereConditions.push('f.school_id = ?');
      queryParams.push(filters.school_id);
    }
    
    if (filters.fee_type) {
      whereConditions.push('f.fee_type = ?');
      queryParams.push(filters.fee_type);
    }
    
    if (filters.class_id) {
      whereConditions.push('f.class_id = ?');
      queryParams.push(filters.class_id);
    }
    
    if (filters.category_id) {
      whereConditions.push('f.category_id = ?');
      queryParams.push(filters.category_id);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    query += ' ORDER BY c.name, cl.grade_level';
    
    return queryAsync(query, queryParams);
  },
  
  /**
   * Get fee by ID
   * @param {number} id - Fee ID
   * @param {Function} callback - Callback function
   */
  getById: (id, callback) => {
    const query = `
      SELECT f.*, c.name as category_name, cl.name as class_name, s.name as school_name
      FROM fees f
      JOIN categories c ON f.category_id = c.id
      JOIN classes cl ON f.class_id = cl.id
      LEFT JOIN schools s ON f.school_id = s.id
      WHERE f.id = ?
    `;
    
    db.query(query, [id], callback);
  },
  
  /**
   * Get fee by ID with promise support
   * @param {number} id - Fee ID
   * @returns {Promise} - Promise resolving to fee object
   */
  getByIdAsync: async (id) => {
    const query = `
      SELECT f.*, c.name as category_name, cl.name as class_name, s.name as school_name
      FROM fees f
      JOIN categories c ON f.category_id = c.id
      JOIN classes cl ON f.class_id = cl.id
      LEFT JOIN schools s ON f.school_id = s.id
      WHERE f.id = ?
    `;
    
    const [result] = await queryAsync(query, [id]);
    return result[0];
  },
  
  /**
   * Get fees by class and category
   * @param {number} classId - Class ID
   * @param {number} categoryId - Category ID
   * @param {Function} callback - Callback function
   */
  getByClassAndCategory: (classId, categoryId, callback) => {
    const query = `
      SELECT f.*, c.name as category_name, cl.name as class_name
      FROM fees f
      JOIN categories c ON f.category_id = c.id
      JOIN classes cl ON f.class_id = cl.id
      WHERE f.class_id = ? AND f.category_id = ?
    `;
    
    db.query(query, [classId, categoryId], callback);
  },
  
  /**
   * Get fees by class and category with promise support
   * @param {number} classId - Class ID
   * @param {number} categoryId - Category ID
   * @returns {Promise} - Promise resolving to fees array
   */
  getByClassAndCategoryAsync: async (classId, categoryId) => {
    const query = `
      SELECT f.*, c.name as category_name, cl.name as class_name
      FROM fees f
      JOIN categories c ON f.category_id = c.id
      JOIN classes cl ON f.class_id = cl.id
      WHERE f.class_id = ? AND f.category_id = ?
    `;
    
    return queryAsync(query, [classId, categoryId]);
  },
  
  /**
   * Create a new fee with validation
   * @param {Object} data - Fee data
   * @param {Function} callback - Callback function
   */
  create: (data, callback) => {
    // Validate fee data
    const validation = validateFeeData(data);
    
    if (!validation.isValid) {
      const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
      return callback(error);
    }
    
    // Check if fee already exists
    const checkQuery = `
      SELECT id FROM fees 
      WHERE category_id = ? AND class_id = ? AND fee_type = ?
    `;
    
    db.query(checkQuery, [data.category_id, data.class_id, data.fee_type], (err, results) => {
      if (err) return callback(err);
      
      if (results.length > 0) {
        return callback(new Error('Fee already exists for this category, class, and fee type'));
      }
      
      // Insert new fee
      db.query('INSERT INTO fees SET ?', data, callback);
    });
  },
  
  /**
   * Create a new fee with promise support and transaction
   * @param {Object} data - Fee data
   * @returns {Promise} - Promise resolving to inserted ID
   */
  createAsync: async (data) => {
    // Validate fee data
    const validation = validateFeeData(data);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Start transaction
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if fee already exists
      const [existingFees] = await connection.query(
        'SELECT id FROM fees WHERE category_id = ? AND class_id = ? AND fee_type = ?',
        [data.category_id, data.class_id, data.fee_type]
      );
      
      if (existingFees.length > 0) {
        throw new Error('Fee already exists for this category, class, and fee type');
      }
      
      // Insert new fee
      const [result] = await connection.query('INSERT INTO fees SET ?', data);
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      return result.insertId;
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      connection.release();
      throw error;
    }
  },
  
  /**
   * Update an existing fee
   * @param {number} id - Fee ID
   * @param {Object} data - Updated fee data
   * @param {Function} callback - Callback function
   */
  update: (id, data, callback) => {
    // Validate fee data
    const validation = validateFeeData(data);
    
    if (!validation.isValid) {
      const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
      return callback(error);
    }
    
    // Check if fee exists
    db.query('SELECT id FROM fees WHERE id = ?', [id], (err, results) => {
      if (err) return callback(err);
      
      if (results.length === 0) {
        return callback(new Error('Fee not found'));
      }
      
      // Update fee
      db.query('UPDATE fees SET ? WHERE id = ?', [data, id], callback);
    });
  },
  
  /**
   * Update an existing fee with promise support and transaction
   * @param {number} id - Fee ID
   * @param {Object} data - Updated fee data
   * @returns {Promise} - Promise resolving to boolean success
   */
  updateAsync: async (id, data) => {
    // Validate fee data
    const validation = validateFeeData(data);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Start transaction
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if fee exists
      const [existingFee] = await connection.query('SELECT id FROM fees WHERE id = ?', [id]);
      
      if (existingFee.length === 0) {
        throw new Error('Fee not found');
      }
      
      // Update fee
      const [result] = await connection.query('UPDATE fees SET ? WHERE id = ?', [data, id]);
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      return result.affectedRows > 0;
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      connection.release();
      throw error;
    }
  },
  
  /**
   * Delete a fee
   * @param {number} id - Fee ID
   * @param {Function} callback - Callback function
   */
  delete: (id, callback) => {
    // Check if fee exists
    db.query('SELECT id FROM fees WHERE id = ?', [id], (err, results) => {
      if (err) return callback(err);
      
      if (results.length === 0) {
        return callback(new Error('Fee not found'));
      }
      
      // Check if fee has payments
      db.query('SELECT id FROM payments WHERE fee_id = ? LIMIT 1', [id], (err, paymentResults) => {
        if (err) return callback(err);
        
        if (paymentResults.length > 0) {
          return callback(new Error('Cannot delete fee with existing payments'));
        }
        
        // Delete fee
        db.query('DELETE FROM fees WHERE id = ?', [id], callback);
      });
    });
  },
  
  /**
   * Delete a fee with promise support and transaction
   * @param {number} id - Fee ID
   * @returns {Promise} - Promise resolving to boolean success
   */
  deleteAsync: async (id) => {
    // Start transaction
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if fee exists
      const [existingFee] = await connection.query('SELECT id FROM fees WHERE id = ?', [id]);
      
      if (existingFee.length === 0) {
        throw new Error('Fee not found');
      }
      
      // Check if fee has payments
      const [existingPayments] = await connection.query(
        'SELECT id FROM payments WHERE fee_id = ? LIMIT 1', 
        [id]
      );
      
      if (existingPayments.length > 0) {
        throw new Error('Cannot delete fee with existing payments');
      }
      
      // Delete fee
      const [result] = await connection.query('DELETE FROM fees WHERE id = ?', [id]);
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      return result.affectedRows > 0;
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      connection.release();
      throw error;
    }
  },
  
  /**
   * Get outstanding fees for a student
   * @param {number} studentId - Student ID
   * @param {Function} callback - Callback function
   */
  getOutstandingFees: (studentId, callback) => {
    const query = `
      SELECT f.*, c.name as category_name, cl.name as class_name,
       (f.amount - COALESCE(SUM(p.amount_paid), 0)) as outstanding_amount
       FROM fees f
       LEFT JOIN categories c ON f.category_id = c.id
       LEFT JOIN classes cl ON f.class_id = cl.id
       LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
       WHERE f.class_id = (SELECT class_id FROM students WHERE id = ?)
       AND f.category_id = (SELECT category_id FROM students WHERE id = ?)
       GROUP BY f.id
       HAVING outstanding_amount > 0
    `;
    
    db.query(query, [studentId, studentId, studentId], callback);
  },
  
  /**
   * Get outstanding fees for a student with promise support
   * @param {number} studentId - Student ID
   * @returns {Promise} - Promise resolving to outstanding fees array
   */
  getOutstandingFeesAsync: async (studentId) => {
    const query = `
      SELECT f.*, c.name as category_name, cl.name as class_name,
       (f.amount - COALESCE(SUM(p.amount_paid), 0)) as outstanding_amount
       FROM fees f
       LEFT JOIN categories c ON f.category_id = c.id
       LEFT JOIN classes cl ON f.class_id = cl.id
       LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
       WHERE f.class_id = (SELECT class_id FROM students WHERE id = ?)
       AND f.category_id = (SELECT category_id FROM students WHERE id = ?)
       GROUP BY f.id
       HAVING outstanding_amount > 0
    `;
    
    return queryAsync(query, [studentId, studentId, studentId]);
  },
  
  /**
   * Get fee payment status summary for a student
   * @param {number} studentId - Student ID
   * @param {Function} callback - Callback function
   */
  getStudentFeeSummary: (studentId, callback) => {
    const query = `
      SELECT f.id as fee_id, f.fee_type, f.amount as total_amount, f.description,
             COALESCE(SUM(p.amount_paid), 0) as amount_paid,
             f.amount - COALESCE(SUM(p.amount_paid), 0) as remaining_amount,
             (f.amount - COALESCE(SUM(p.amount_paid), 0) <= 0) as is_paid
      FROM fees f
      LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
      WHERE f.class_id = (SELECT class_id FROM students WHERE id = ?)
      AND f.category_id = (SELECT category_id FROM students WHERE id = ?)
      GROUP BY f.id
      ORDER BY f.fee_type
    `;
    
    db.query(query, [studentId, studentId, studentId], callback);
  },
  
  /**
   * Get fee payment status summary for a student with promise support
   * @param {number} studentId - Student ID
   * @returns {Promise} - Promise resolving to fee summary array
   */
  getStudentFeeSummaryAsync: async (studentId) => {
    const query = `
      SELECT f.id as fee_id, f.fee_type, f.amount as total_amount, f.description,
             COALESCE(SUM(p.amount_paid), 0) as amount_paid,
             f.amount - COALESCE(SUM(p.amount_paid), 0) as remaining_amount,
             (f.amount - COALESCE(SUM(p.amount_paid), 0) <= 0) as is_paid
      FROM fees f
      LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
      WHERE f.class_id = (SELECT class_id FROM students WHERE id = ?)
      AND f.category_id = (SELECT category_id FROM students WHERE id = ?)
      GROUP BY f.id
      ORDER BY f.fee_type
    `;
    
    return queryAsync(query, [studentId, studentId, studentId]);
  },
  
  /**
   * Check if a fee is fully paid for a student
   * @param {number} feeId - Fee ID
   * @param {number} studentId - Student ID
   * @param {Function} callback - Callback function
   */
  isFeePaid: (feeId, studentId, callback) => {
    const query = `
      SELECT 
        f.amount as total_amount,
        COALESCE(SUM(p.amount_paid), 0) as amount_paid,
        (f.amount - COALESCE(SUM(p.amount_paid), 0) <= 0) as is_paid
      FROM fees f
      LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
      WHERE f.id = ?
      GROUP BY f.id
    `;
    
    db.query(query, [studentId, feeId], (err, results) => {
      if (err) return callback(err);
      
      if (results.length === 0) {
        return callback(new Error('Fee not found'));
      }
      
      callback(null, results[0].is_paid);
    });
  },
  
  /**
   * Check if a fee is fully paid for a student with promise support
   * @param {number} feeId - Fee ID
   * @param {number} studentId - Student ID
   * @returns {Promise} - Promise resolving to boolean isPaid
   */
  isFeePaidAsync: async (feeId, studentId) => {
    const query = `
      SELECT 
        f.amount as total_amount,
        COALESCE(SUM(p.amount_paid), 0) as amount_paid,
        (f.amount - COALESCE(SUM(p.amount_paid), 0) <= 0) as is_paid
      FROM fees f
      LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
      WHERE f.id = ?
      GROUP BY f.id
    `;
    
    const [results] = await queryAsync(query, [studentId, feeId]);
    
    if (results.length === 0) {
      throw new Error('Fee not found');
    }
    
    return results[0].is_paid === 1;
  },
  
  /**
   * Get remaining amount to be paid for a fee by a student
   * @param {number} feeId - Fee ID
   * @param {number} studentId - Student ID
   * @param {Function} callback - Callback function
   */
  getRemainingAmount: (feeId, studentId, callback) => {
    const query = `
      SELECT 
        f.amount as total_amount,
        COALESCE(SUM(p.amount_paid), 0) as amount_paid,
        f.amount - COALESCE(SUM(p.amount_paid), 0) as remaining_amount
      FROM fees f
      LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
      WHERE f.id = ?
      GROUP BY f.id
    `;
    
    db.query(query, [studentId, feeId], (err, results) => {
      if (err) return callback(err);
      
      if (results.length === 0) {
        return callback(new Error('Fee not found'));
      }
      
      callback(null, results[0].remaining_amount);
    });
  },
  
  /**
   * Get remaining amount to be paid for a fee by a student with promise support
   * @param {number} feeId - Fee ID
   * @param {number} studentId - Student ID
   * @returns {Promise} - Promise resolving to remaining amount
   */
  getRemainingAmountAsync: async (feeId, studentId) => {
    const query = `
      SELECT 
        f.amount as total_amount,
        COALESCE(SUM(p.amount_paid), 0) as amount_paid,
        f.amount - COALESCE(SUM(p.amount_paid), 0) as remaining_amount
      FROM fees f
      LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
      WHERE f.id = ?
      GROUP BY f.id
    `;
    
    const [results] = await queryAsync(query, [studentId, feeId]);
    
    if (results.length === 0) {
      throw new Error('Fee not found');
    }
    
    return results[0].remaining_amount;
  }
};

module.exports = Fee;
