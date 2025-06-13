const db = require('../config/db');
const Fee = require('./feeModel');
const Receipt = require('./receiptModel');
const { promisify } = require('util');

// Convert db.query to support promises
const queryAsync = promisify(db.query).bind(db);

/**
 * Validates payment data
 * @param {Object} data - Payment data to validate
 * @returns {Object} - Object with isValid boolean and errors array
 */
const validatePaymentData = (data) => {
  const errors = [];
  
  // Check required fields
  if (!data.student_id) {
    errors.push('Student ID is required');
  }
  
  if (!data.fee_id) {
    errors.push('Fee ID is required');
  }
  
  if (!data.amount_paid || isNaN(parseFloat(data.amount_paid)) || parseFloat(data.amount_paid) <= 0) {
    errors.push('Valid payment amount is required');
  }
  
  // Payment date should be valid or defaults to current date
  if (data.payment_date && isNaN(new Date(data.payment_date).getTime())) {
    errors.push('Invalid payment date');
  }
  
  // Installment number should be a positive integer
  if (data.installment_number && (isNaN(parseInt(data.installment_number)) || parseInt(data.installment_number) <= 0)) {
    errors.push('Installment number must be a positive integer');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const Payment = {
  /**
   * Record a new payment with validation
   * @param {Object} data - Payment data
   * @param {Function} callback - Callback function
   */
  recordPayment: (data, callback) => {
    // Validate payment data
    const validation = validatePaymentData(data);
    
    if (!validation.isValid) {
      const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
      return callback(error);
    }
    
    // Check if student exists
    db.query('SELECT id FROM students WHERE id = ?', [data.student_id], (err, studentResults) => {
      if (err) return callback(err);
      
      if (studentResults.length === 0) {
        return callback(new Error('Student not found'));
      }
      
      // Check if fee exists
      db.query('SELECT id, amount FROM fees WHERE id = ?', [data.fee_id], (err, feeResults) => {
        if (err) return callback(err);
        
        if (feeResults.length === 0) {
          return callback(new Error('Fee not found'));
        }
        
        // Get total amount paid so far
        db.query(
          'SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM payments WHERE student_id = ? AND fee_id = ?',
          [data.student_id, data.fee_id],
          (err, paymentResults) => {
            if (err) return callback(err);
            
            const feeAmount = feeResults[0].amount;
            const totalPaid = paymentResults[0].total_paid;
            const newTotal = totalPaid + parseFloat(data.amount_paid);
            
            // Check if payment would exceed fee amount
            if (newTotal > feeAmount) {
              return callback(new Error(
                `Payment of ${data.amount_paid} would exceed the fee amount. Maximum allowed payment is ${(feeAmount - totalPaid).toFixed(2)}`
              ));
            }
            
            // Set default values
            const paymentDate = data.payment_date || new Date().toISOString().split('T')[0];
            const installmentNumber = data.installment_number || 1;
            
            // Create payment object
            const paymentData = {
              student_id: data.student_id,
              fee_id: data.fee_id,
              amount_paid: data.amount_paid,
              payment_date: paymentDate,
              payment_method: data.payment_method || 'cash',
              transaction_reference: data.transaction_reference,
              installment_number: installmentNumber,
              remarks: data.remarks,
              recorded_by: data.recorded_by,
              school_id: data.school_id
            };
            
            // Insert payment
            db.query('INSERT INTO payments SET ?', paymentData, (err, result) => {
              if (err) return callback(err);
              
              // Check if fee is fully paid and generate receipt if needed
              if (newTotal >= feeAmount) {
                // Get fee type for receipt
                db.query('SELECT fee_type FROM fees WHERE id = ?', [data.fee_id], (err, feeTypeResult) => {
                  if (err) return callback(err);
                  
                  const receiptData = {
                    student_id: data.student_id,
                    payment_id: result.insertId,
                    receipt_type: feeTypeResult[0].fee_type,
                    amount: feeAmount,
                    date_issued: new Date().toISOString().split('T')[0],
                    issued_by: data.recorded_by,
                    class_id: data.class_id || null,
                    school_id: data.school_id || null
                  };
                  
                  // Generate receipt
                  Receipt.create(receiptData, (err) => {
                    if (err) {
                      console.error('Error generating receipt:', err);
                    }
                    
                    callback(null, {
                      id: result.insertId,
                      ...paymentData,
                      is_paid_in_full: true
                    });
                  });
                });
              } else {
                callback(null, {
                  id: result.insertId,
                  ...paymentData,
                  is_paid_in_full: false
                });
              }
            });
          }
        );
      });
    });
  },
  
  /**
   * Record a new payment with promise support and transaction
   * @param {Object} data - Payment data
   * @returns {Promise} - Promise resolving to payment object
   */
  recordPaymentAsync: async (data) => {
    // Validate payment data
    const validation = validatePaymentData(data);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if student exists
      const [studentResults] = await connection.query(
        'SELECT id FROM students WHERE id = ?', 
        [data.student_id]
      );
      
      if (studentResults.length === 0) {
        throw new Error('Student not found');
      }
      
      // Check if fee exists
      const [feeResults] = await connection.query(
        'SELECT id, amount, fee_type FROM fees WHERE id = ?', 
        [data.fee_id]
      );
      
      if (feeResults.length === 0) {
        throw new Error('Fee not found');
      }
      
      // Get total amount paid so far
      const [paymentResults] = await connection.query(
        'SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM payments WHERE student_id = ? AND fee_id = ?',
        [data.student_id, data.fee_id]
      );
      
      const feeAmount = feeResults[0].amount;
      const totalPaid = paymentResults[0].total_paid;
      const newTotal = totalPaid + parseFloat(data.amount_paid);
      
      // Check if payment would exceed fee amount
      if (newTotal > feeAmount) {
        throw new Error(
          `Payment of ${data.amount_paid} would exceed the fee amount. Maximum allowed payment is ${(feeAmount - totalPaid).toFixed(2)}`
        );
      }
      
      // Set default values
      const today = new Date().toISOString().split('T')[0];
      const paymentDate = data.payment_date || today;
      const installmentNumber = data.installment_number || 1;
      
      // Get student class if not provided
      let classId = data.class_id;
      if (!classId) {
        const [studentClass] = await connection.query(
          'SELECT class_id FROM students WHERE id = ?',
          [data.student_id]
        );
        classId = studentClass[0].class_id;
      }
      
      // Create payment object
      const paymentData = {
        student_id: data.student_id,
        fee_id: data.fee_id,
        amount_paid: data.amount_paid,
        payment_date: paymentDate,
        payment_method: data.payment_method || 'cash',
        transaction_reference: data.transaction_reference,
        installment_number: installmentNumber,
        remarks: data.remarks,
        recorded_by: data.recorded_by,
        school_id: data.school_id
      };
      
      // Insert payment
      const [result] = await connection.query('INSERT INTO payments SET ?', paymentData);
      
      // Initialize receipt data
      let receiptId = null;
      const isPaidInFull = newTotal >= feeAmount;
      
      // Check if fee is fully paid and generate receipt if needed
      if (isPaidInFull) {
        const receiptData = {
          student_id: data.student_id,
          payment_id: result.insertId,
          receipt_type: feeResults[0].fee_type,
          amount: feeAmount,
          date_issued: today,
          issued_by: data.recorded_by,
          class_id: classId,
          school_id: data.school_id || null
        };
        
        // Generate receipt
        const [receiptResult] = await connection.query('INSERT INTO receipts SET ?', receiptData);
        receiptId = receiptResult.insertId;
      }
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      return {
        id: result.insertId,
        ...paymentData,
        is_paid_in_full: isPaidInFull,
        receipt_id: receiptId
      };
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      connection.release();
      throw error;
    }
  },
  
  /**
   * Get all payments for a student
   * @param {number} studentId - Student ID
   * @param {Function} callback - Callback function
   */
  getPaymentsByStudent: (studentId, callback) => {
    const query = `
      SELECT p.*, 
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name,
             (SELECT COUNT(*) > 0 FROM receipts r WHERE r.payment_id = p.id) as has_receipt
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      LEFT JOIN users u ON p.recorded_by = u.id
      LEFT JOIN schools sch ON p.school_id = sch.id
      WHERE p.student_id = ?
      ORDER BY p.payment_date DESC
    `;
    
    db.query(query, [studentId], callback);
  },
  
  /**
   * Get all payments for a student with promise support
   * @param {number} studentId - Student ID
   * @returns {Promise} - Promise resolving to payments array
   */
  getPaymentsByStudentAsync: async (studentId) => {
    const query = `
      SELECT p.*, 
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name,
             (SELECT COUNT(*) > 0 FROM receipts r WHERE r.payment_id = p.id) as has_receipt
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      LEFT JOIN users u ON p.recorded_by = u.id
      LEFT JOIN schools sch ON p.school_id = sch.id
      WHERE p.student_id = ?
      ORDER BY p.payment_date DESC
    `;
    
    return queryAsync(query, [studentId]);
  },
  
  /**
   * Get all payments with filters
   * @param {Object} filters - Optional filters (student_id, fee_id, payment_date_from, payment_date_to, school_id)
   * @param {Function} callback - Callback function
   */
  getAllPayments: (filters = {}, callback) => {
    let query = `
      SELECT p.*, 
             s.first_name, s.middle_name, s.last_name,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN fees f ON p.fee_id = f.id
      LEFT JOIN users u ON p.recorded_by = u.id
      LEFT JOIN schools sch ON p.school_id = sch.id
    `;
    
    const queryParams = [];
    const whereConditions = [];
    
    // Add filters if provided
    if (filters.student_id) {
      whereConditions.push('p.student_id = ?');
      queryParams.push(filters.student_id);
    }
    
    if (filters.fee_id) {
      whereConditions.push('p.fee_id = ?');
      queryParams.push(filters.fee_id);
    }
    
    if (filters.payment_date_from) {
      whereConditions.push('p.payment_date >= ?');
      queryParams.push(filters.payment_date_from);
    }
    
    if (filters.payment_date_to) {
      whereConditions.push('p.payment_date <= ?');
      queryParams.push(filters.payment_date_to);
    }
    
    if (filters.school_id) {
      whereConditions.push('p.school_id = ?');
      queryParams.push(filters.school_id);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    query += ' ORDER BY p.payment_date DESC';
    
    db.query(query, queryParams, callback);
  },
  
  /**
   * Get all payments with filters and promise support
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Promise resolving to payments array
   */
  getAllPaymentsAsync: async (filters = {}) => {
    let query = `
      SELECT p.*, 
             s.first_name, s.middle_name, s.last_name,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN fees f ON p.fee_id = f.id
      LEFT JOIN users u ON p.recorded_by = u.id
      LEFT JOIN schools sch ON p.school_id = sch.id
    `;
    
    const queryParams = [];
    const whereConditions = [];
    
    // Add filters if provided
    if (filters.student_id) {
      whereConditions.push('p.student_id = ?');
      queryParams.push(filters.student_id);
    }
    
    if (filters.fee_id) {
      whereConditions.push('p.fee_id = ?');
      queryParams.push(filters.fee_id);
    }
    
    if (filters.payment_date_from) {
      whereConditions.push('p.payment_date >= ?');
      queryParams.push(filters.payment_date_from);
    }
    
    if (filters.payment_date_to) {
      whereConditions.push('p.payment_date <= ?');
      queryParams.push(filters.payment_date_to);
    }
    
    if (filters.school_id) {
      whereConditions.push('p.school_id = ?');
      queryParams.push(filters.school_id);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    query += ' ORDER BY p.payment_date DESC';
    
    return queryAsync(query, queryParams);
  },
  
  /**
   * Get payment by ID
   * @param {number} id - Payment ID
   * @param {Function} callback - Callback function
   */
  getPaymentById: (id, callback) => {
    const query = `
      SELECT p.*, 
             s.first_name, s.middle_name, s.last_name,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name,
             (SELECT COUNT(*) > 0 FROM receipts r WHERE r.payment_id = p.id) as has_receipt
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN fees f ON p.fee_id = f.id
      LEFT JOIN users u ON p.recorded_by = u.id
      LEFT JOIN schools sch ON p.school_id = sch.id
      WHERE p.id = ?
    `;
    
    db.query(query, [id], (err, results) => {
      if (err) return callback(err);
      
      if (results.length === 0) {
        return callback(new Error('Payment not found'));
      }
      
      callback(null, results[0]);
    });
  },
  
  /**
   * Get payment by ID with promise support
   * @param {number} id - Payment ID
   * @returns {Promise} - Promise resolving to payment object
   */
  getPaymentByIdAsync: async (id) => {
    const query = `
      SELECT p.*, 
             s.first_name, s.middle_name, s.last_name,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name,
             (SELECT COUNT(*) > 0 FROM receipts r WHERE r.payment_id = p.id) as has_receipt
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN fees f ON p.fee_id = f.id
      LEFT JOIN users u ON p.recorded_by = u.id
      LEFT JOIN schools sch ON p.school_id = sch.id
      WHERE p.id = ?
    `;
    
    const [results] = await queryAsync(query, [id]);
    
    if (results.length === 0) {
      throw new Error('Payment not found');
    }
    
    return results[0];
  },
  
  /**
   * Get payment summary for a student
   * @param {number} studentId - Student ID
   * @param {Function} callback - Callback function
   */
  getStudentPaymentSummary: (studentId, callback) => {
    // Get student info
    db.query('SELECT id, class_id, category_id FROM students WHERE id = ?', [studentId], (err, studentResults) => {
      if (err) return callback(err);
      
      if (studentResults.length === 0) {
        return callback(new Error('Student not found'));
      }
      
      const student = studentResults[0];
      
      // Get all payments for this student
      const paymentQuery = `
        SELECT p.*, 
               f.fee_type, f.amount as fee_amount, f.description as fee_description,
               CONCAT(u.full_name) as recorded_by_name,
               sch.name as school_name,
               (SELECT COUNT(*) > 0 FROM receipts r WHERE r.payment_id = p.id) as has_receipt
        FROM payments p
        JOIN fees f ON p.fee_id = f.id
        LEFT JOIN users u ON p.recorded_by = u.id
        LEFT JOIN schools sch ON p.school_id = sch.id
        WHERE p.student_id = ?
        ORDER BY p.payment_date DESC
      `;
      
      db.query(paymentQuery, [studentId], (err, payments) => {
        if (err) return callback(err);
        
        // Get fee payment summary
        const feeSummaryQuery = `
          SELECT f.id as fee_id, f.fee_type, f.amount as total_amount, f.description,
                 COALESCE(SUM(p.amount_paid), 0) as amount_paid,
                 f.amount - COALESCE(SUM(p.amount_paid), 0) as remaining_amount,
                 (f.amount - COALESCE(SUM(p.amount_paid), 0) <= 0) as is_paid
          FROM fees f
          LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
          WHERE f.class_id = ? AND f.category_id = ?
          GROUP BY f.id
          ORDER BY f.fee_type
        `;
        
        db.query(feeSummaryQuery, [studentId, student.class_id, student.category_id], (err, feeSummary) => {
          if (err) return callback(err);
          
          const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
          const totalFees = feeSummary.reduce((sum, fee) => sum + fee.total_amount, 0);
          const totalRemaining = feeSummary.reduce((sum, fee) => sum + fee.remaining_amount, 0);
          
          callback(null, {
            student_id: parseInt(studentId),
            payments,
            fee_summary: feeSummary,
            total_paid: totalPaid,
            total_fees: totalFees,
            total_remaining: totalRemaining,
            payment_count: payments.length,
            is_fully_paid: totalRemaining <= 0
          });
        });
      });
    });
  },
  
  /**
   * Get payment summary for a student with promise support
   * @param {number} studentId - Student ID
   * @returns {Promise} - Promise resolving to payment summary object
   */
  getStudentPaymentSummaryAsync: async (studentId) => {
    // Get student info
    const [studentResults] = await queryAsync('SELECT id, class_id, category_id FROM students WHERE id = ?', [studentId]);
    
    if (studentResults.length === 0) {
      throw new Error('Student not found');
    }
    
    const student = studentResults[0];
    
    // Get all payments for this student
    const paymentQuery = `
      SELECT p.*, 
             f.fee_type, f.amount as fee_amount, f.description as fee_description,
             CONCAT(u.full_name) as recorded_by_name,
             sch.name as school_name,
             (SELECT COUNT(*) > 0 FROM receipts r WHERE r.payment_id = p.id) as has_receipt
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      LEFT JOIN users u ON p.recorded_by = u.id
      LEFT JOIN schools sch ON p.school_id = sch.id
      WHERE p.student_id = ?
      ORDER BY p.payment_date DESC
    `;
    
    const [payments] = await queryAsync(paymentQuery, [studentId]);
    
    // Get fee payment summary
    const feeSummaryQuery = `
      SELECT f.id as fee_id, f.fee_type, f.amount as total_amount, f.description,
             COALESCE(SUM(p.amount_paid), 0) as amount_paid,
             f.amount - COALESCE(SUM(p.amount_paid), 0) as remaining_amount,
             (f.amount - COALESCE(SUM(p.amount_paid), 0) <= 0) as is_paid
      FROM fees f
      LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
      WHERE f.class_id = ? AND f.category_id = ?
      GROUP BY f.id
      ORDER BY f.fee_type
    `;
    
    const [feeSummary] = await queryAsync(feeSummaryQuery, [studentId, student.class_id, student.category_id]);
    
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount_paid), 0);
    const totalFees = feeSummary.reduce((sum, fee) => sum + parseFloat(fee.total_amount), 0);
    const totalRemaining = feeSummary.reduce((sum, fee) => sum + parseFloat(fee.remaining_amount), 0);
    
    return {
      student_id: parseInt(studentId),
      payments,
      fee_summary: feeSummary,
      total_paid: totalPaid,
      total_fees: totalFees,
      total_remaining: totalRemaining,
      payment_count: payments.length,
      is_fully_paid: totalRemaining <= 0
    };
  },
  
  /**
   * Generate receipt for a payment
   * @param {number} paymentId - Payment ID
   * @param {Object} data - Additional receipt data
   * @param {Function} callback - Callback function
   */
  generateReceipt: (paymentId, data = {}, callback) => {
    // Check if payment exists
    db.query('SELECT * FROM payments WHERE id = ?', [paymentId], (err, paymentResults) => {
      if (err) return callback(err);
      
      if (paymentResults.length === 0) {
        return callback(new Error('Payment not found'));
      }
      
      // Check if receipt already exists
      db.query('SELECT id FROM receipts WHERE payment_id = ?', [paymentId], (err, receiptResults) => {
        if (err) return callback(err);
        
        if (receiptResults.length > 0) {
          return callback(new Error('Receipt already exists for this payment'));
        }
        
        // Get fee type for receipt
        db.query('SELECT fee_type FROM fees WHERE id = ?', [paymentResults[0].fee_id], (err, feeTypeResult) => {
          if (err) return callback(err);
          
          // Get student class if not provided
          const getClassId = (cb) => {
            if (data.class_id) {
              cb(null, data.class_id);
            } else {
              db.query('SELECT class_id FROM students WHERE id = ?', [paymentResults[0].student_id], (err, result) => {
                if (err) return cb(err);
                cb(null, result[0].class_id);
              });
            }
          };
          
          getClassId((err, classId) => {
            if (err) return callback(err);
            
            const receiptData = {
              student_id: paymentResults[0].student_id,
              payment_id: paymentId,
              receipt_type: feeTypeResult[0].fee_type,
              amount: data.amount || paymentResults[0].amount_paid,
              date_issued: data.date_issued || new Date().toISOString().split('T')[0],
              issued_by: data.issued_by || paymentResults[0].recorded_by,
              class_id: classId,
              school_id: data.school_id || paymentResults[0].school_id
            };
            
            // Generate receipt
            Receipt.create(receiptData, (err, result) => {
              if (err) return callback(err);
              
              callback(null, {
                id: result.insertId,
                ...receiptData
              });
            });
          });
        });
      });
    });
  },
  
  /**
   * Generate receipt for a payment with promise support
   * @param {number} paymentId - Payment ID
   * @param {Object} data - Additional receipt data
   * @returns {Promise} - Promise resolving to receipt object
   */
  generateReceiptAsync: async (paymentId, data = {}) => {
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if payment exists
      const [paymentResults] = await connection.query('SELECT * FROM payments WHERE id = ?', [paymentId]);
      
      if (paymentResults.length === 0) {
        throw new Error('Payment not found');
      }
      
      // Check if receipt already exists
      const [receiptResults] = await connection.query('SELECT id FROM receipts WHERE payment_id = ?', [paymentId]);
      
      if (receiptResults.length > 0) {
        throw new Error('Receipt already exists for this payment');
      }
      
      // Get fee type for receipt
      const [feeTypeResult] = await connection.query(
        'SELECT fee_type FROM fees WHERE id = ?', 
        [paymentResults[0].fee_id]
      );
      
      // Get student class if not provided
      let classId = data.class_id;
      if (!classId) {
        const [studentClass] = await connection.query(
          'SELECT class_id FROM students WHERE id = ?',
          [paymentResults[0].student_id]
        );
        classId = studentClass[0].class_id;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const receiptData = {
        student_id: paymentResults[0].student_id,
        payment_id: paymentId,
        receipt_type: feeTypeResult[0].fee_type,
        amount: data.amount || paymentResults[0].amount_paid,
        date_issued: data.date_issued || today,
        issued_by: data.issued_by || paymentResults[0].recorded_by,
        class_id: classId,
        school_id: data.school_id || paymentResults[0].school_id
      };
      
      // Generate receipt
      const [result] = await connection.query('INSERT INTO receipts SET ?', receiptData);
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      return {
        id: result.insertId,
        ...receiptData
      };
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      connection.release();
      throw error;
    }
  },
  
  /**
   * Delete a payment (only if no receipt exists)
   * @param {number} id - Payment ID
   * @param {Function} callback - Callback function
   */
  deletePayment: (id, callback) => {
    // Check if payment exists
    db.query('SELECT id FROM payments WHERE id = ?', [id], (err, paymentResults) => {
      if (err) return callback(err);
      
      if (paymentResults.length === 0) {
        return callback(new Error('Payment not found'));
      }
      
      // Check if receipt exists
      db.query('SELECT id FROM receipts WHERE payment_id = ?', [id], (err, receiptResults) => {
        if (err) return callback(err);
        
        if (receiptResults.length > 0) {
          return callback(new Error('Cannot delete payment with existing receipt'));
        }
        
        // Delete payment
        db.query('DELETE FROM payments WHERE id = ?', [id], callback);
      });
    });
  },
  
  /**
   * Delete a payment with promise support
   * @param {number} id - Payment ID
   * @returns {Promise} - Promise resolving to boolean success
   */
  deletePaymentAsync: async (id) => {
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if payment exists
      const [paymentResults] = await connection.query('SELECT id FROM payments WHERE id = ?', [id]);
      
      if (paymentResults.length === 0) {
        throw new Error('Payment not found');
      }
      
      // Check if receipt exists
      const [receiptResults] = await connection.query('SELECT id FROM receipts WHERE payment_id = ?', [id]);
      
      if (receiptResults.length > 0) {
        throw new Error('Cannot delete payment with existing receipt');
      }
      
      // Delete payment
      const [result] = await connection.query('DELETE FROM payments WHERE id = ?', [id]);
      
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
   * Update payment details
   * @param {number} id - Payment ID
   * @param {Object} data - Updated payment data
   * @param {Function} callback - Callback function
   */
  updatePayment: (id, data, callback) => {
    // Check if payment exists
    db.query('SELECT * FROM payments WHERE id = ?', [id], (err, paymentResults) => {
      if (err) return callback(err);
      
      if (paymentResults.length === 0) {
        return callback(new Error('Payment not found'));
      }
      
      const payment = paymentResults[0];
      
      // Check if receipt exists - cannot modify amount if receipt exists
      db.query('SELECT id FROM receipts WHERE payment_id = ?', [id], (err, receiptResults) => {
        if (err) return callback(err);
        
        if (receiptResults.length > 0 && data.amount_paid && data.amount_paid !== payment.amount_paid) {
          return callback(new Error('Cannot change payment amount when receipt exists'));
        }
        
        // Check if fee exists
        db.query('SELECT id, amount FROM fees WHERE id = ?', [payment.fee_id], (err, feeResults) => {
          if (err) return callback(err);
          
          // Get total amount paid excluding this payment
          db.query(
            'SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM payments WHERE student_id = ? AND fee_id = ? AND id != ?',
            [payment.student_id, payment.fee_id, id],
            (err, otherPaymentsResults) => {
              if (err) return callback(err);
              
              const feeAmount = feeResults[0].amount;
              const otherPayments = otherPaymentsResults[0].total_paid;
              const newAmount = data.amount_paid || payment.amount_paid;
              const newTotal = otherPayments + parseFloat(newAmount);
              
              // Check if payment would exceed fee amount
              if (newTotal > feeAmount) {
                return callback(new Error(
                  `Payment of ${newAmount} would exceed the fee amount. Maximum allowed payment is ${(feeAmount - otherPayments).toFixed(2)}`
                ));
              }
              
              // Update payment
              db.query('UPDATE payments SET ? WHERE id = ?', [data, id], callback);
            }
          );
        });
      });
    });
  },
  
  /**
   * Update payment details with promise support
   * @param {number} id - Payment ID
   * @param {Object} data - Updated payment data
   * @returns {Promise} - Promise resolving to boolean success
   */
  updatePaymentAsync: async (id, data) => {
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if payment exists
      const [paymentResults] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
      
      if (paymentResults.length === 0) {
        throw new Error('Payment not found');
      }
      
      const payment = paymentResults[0];
      
      // Check if receipt exists - cannot modify amount if receipt exists
      const [receiptResults] = await connection.query('SELECT id FROM receipts WHERE payment_id = ?', [id]);
      
      if (receiptResults.length > 0 && data.amount_paid && data.amount_paid !== payment.amount_paid) {
        throw new Error('Cannot change payment amount when receipt exists');
      }
      
      // Check if fee exists
      const [feeResults] = await connection.query('SELECT id, amount FROM fees WHERE id = ?', [payment.fee_id]);
      
      // Get total amount paid excluding this payment
      const [otherPaymentsResults] = await connection.query(
        'SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM payments WHERE student_id = ? AND fee_id = ? AND id != ?',
        [payment.student_id, payment.fee_id, id]
      );
      
      const feeAmount = feeResults[0].amount;
      const otherPayments = otherPaymentsResults[0].total_paid;
      const newAmount = data.amount_paid || payment.amount_paid;
      const newTotal = otherPayments + parseFloat(newAmount);
      
      // Check if payment would exceed fee amount
      if (newTotal > feeAmount) {
        throw new Error(
          `Payment of ${newAmount} would exceed the fee amount. Maximum allowed payment is ${(feeAmount - otherPayments).toFixed(2)}`
        );
      }
      
      // Update payment
      const [result] = await connection.query('UPDATE payments SET ? WHERE id = ?', [data, id]);
      
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
   * Get payment statistics
   * @param {Object} filters - Optional filters (school_id, date_from, date_to)
   * @param {Function} callback - Callback function
   */
  getPaymentStats: (filters = {}, callback) => {
    let whereClause = '';
    const queryParams = [];
    
    // Build where clause
    if (filters.school_id || filters.date_from || filters.date_to) {
      const conditions = [];
      
      if (filters.school_id) {
        conditions.push('p.school_id = ?');
        queryParams.push(filters.school_id);
      }
      
      if (filters.date_from) {
        conditions.push('p.payment_date >= ?');
        queryParams.push(filters.date_from);
      }
      
      if (filters.date_to) {
        conditions.push('p.payment_date <= ?');
        queryParams.push(filters.date_to);
      }
      
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    
    // Total payments
    const totalQuery = `
      SELECT COUNT(*) as total_count, 
             SUM(amount_paid) as total_amount
      FROM payments p
      ${whereClause}
    `;
    
    // Payments by fee type
    const byFeeTypeQuery = `
      SELECT f.fee_type,
             COUNT(p.id) as payment_count,
             SUM(p.amount_paid) as total_amount
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      ${whereClause}
      GROUP BY f.fee_type
      ORDER BY total_amount DESC
    `;
    
    // Payments by date
    const byDateQuery = `
      SELECT DATE(p.payment_date) as payment_date,
             COUNT(p.id) as payment_count,
             SUM(p.amount_paid) as total_amount
      FROM payments p
      ${whereClause}
      GROUP BY DATE(p.payment_date)
      ORDER BY payment_date DESC
      LIMIT 30
    `;
    
    // Run all queries
    db.query(totalQuery, queryParams, (err, totalResults) => {
      if (err) return callback(err);
      
      db.query(byFeeTypeQuery, queryParams, (err, byFeeTypeResults) => {
        if (err) return callback(err);
        
        db.query(byDateQuery, queryParams, (err, byDateResults) => {
          if (err) return callback(err);
          
          callback(null, {
            total: totalResults[0],
            by_fee_type: byFeeTypeResults,
            by_date: byDateResults
          });
        });
      });
    });
  },
  
  /**
   * Get payment statistics with promise support
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Promise resolving to stats object
   */
  getPaymentStatsAsync: async (filters = {}) => {
    let whereClause = '';
    const queryParams = [];
    
    // Build where clause
    if (filters.school_id || filters.date_from || filters.date_to) {
      const conditions = [];
      
      if (filters.school_id) {
        conditions.push('p.school_id = ?');
        queryParams.push(filters.school_id);
      }
      
      if (filters.date_from) {
        conditions.push('p.payment_date >= ?');
        queryParams.push(filters.date_from);
      }
      
      if (filters.date_to) {
        conditions.push('p.payment_date <= ?');
        queryParams.push(filters.date_to);
      }
      
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    
    // Total payments
    const totalQuery = `
      SELECT COUNT(*) as total_count, 
             SUM(amount_paid) as total_amount
      FROM payments p
      ${whereClause}
    `;
    
    // Payments by fee type
    const byFeeTypeQuery = `
      SELECT f.fee_type,
             COUNT(p.id) as payment_count,
             SUM(p.amount_paid) as total_amount
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      ${whereClause}
      GROUP BY f.fee_type
      ORDER BY total_amount DESC
    `;
    
    // Payments by date
    const byDateQuery = `
      SELECT DATE(p.payment_date) as payment_date,
             COUNT(p.id) as payment_count,
             SUM(p.amount_paid) as total_amount
      FROM payments p
      ${whereClause}
      GROUP BY DATE(p.payment_date)
      ORDER BY payment_date DESC
      LIMIT 30
    `;
    
    // Run all queries
    const [totalResults] = await queryAsync(totalQuery, queryParams);
    const [byFeeTypeResults] = await queryAsync(byFeeTypeQuery, queryParams);
    const [byDateResults] = await queryAsync(byDateQuery, queryParams);
    
    return {
      total: totalResults[0],
      by_fee_type: byFeeTypeResults,
      by_date: byDateResults
    };
  }
};

module.exports = Payment;
