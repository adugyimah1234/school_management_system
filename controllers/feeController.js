const db = require('../config/db'); // Database connection

/**
 * Get a specific fee by category and class level
 * @route GET /api/fees/get
 * @access Private
 */
exports.getFee = async (req, res) => {
  try {
    const { category, classLevel } = req.query;
    
    // Validate required parameters
    if (!category || !classLevel) {
      return res.status(400).json({ 
        error: 'Category and class level are required parameters' 
      });
    }
    
    // Query database for fee
    const [result] = await db.promise().query(
      `SELECT f.*, c.name as category_name, cl.name as class_name, s.name as school_name
       FROM fees f
       JOIN categories c ON f.category_id = c.id
       JOIN classes cl ON f.class_id = cl.id
       LEFT JOIN schools s ON f.school_id = s.id
       WHERE f.category_id = ? AND cl.grade_level = ?`,
      [category, classLevel]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }
    
    res.json(result[0]);
  } catch (err) {
    console.error('Error fetching fee:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all fees with optional filters
 * @route GET /api/fees
 * @access Private
 */
exports.getAllFees = async (req, res) => {
  try {
    const { school_id, fee_type } = req.query;
    
    // Build the base query
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
    if (school_id) {
      whereConditions.push('f.school_id = ?');
      queryParams.push(school_id);
    }
    
    if (fee_type) {
      whereConditions.push('f.fee_type = ?');
      queryParams.push(fee_type);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    query += ' ORDER BY c.name, cl.grade_level';
    
    // Execute query
    const [fees] = await db.promise().query(query, queryParams);
    res.json(fees);
  } catch (err) {
    console.error('Error fetching fees:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a new fee structure
 * @route POST /api/fees
 * @access Private (Admin)
 */
exports.createFee = async (req, res) => {
  try {
    const { 
      category_id, 
      class_id, 
      fee_type, 
      amount, 
      description, 
      effective_date,
      school_id 
    } = req.body;
    
    // Validate required fields
    if (!category_id || !class_id || !fee_type || !amount) {
      return res.status(400).json({ 
        error: 'Please provide category_id, class_id, fee_type, and amount' 
      });
    }
    
    // Validate fee type
    const validFeeTypes = ['registration', 'admission', 'tuition', 'exam'];
    if (!validFeeTypes.includes(fee_type)) {
      return res.status(400).json({ 
        error: `Fee type must be one of: ${validFeeTypes.join(', ')}` 
      });
    }
    
    // Check if fee structure already exists
    const [existing] = await db.promise().query(
      'SELECT id FROM fees WHERE category_id = ? AND class_id = ? AND fee_type = ?',
      [category_id, class_id, fee_type]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Fee structure already exists for this category, class, and fee type' 
      });
    }
    
    // Insert new fee structure
    const [result] = await db.promise().query(
      `INSERT INTO fees 
       (category_id, class_id, fee_type, amount, description, effective_date, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id, 
        class_id, 
        fee_type, 
        amount, 
        description || null, 
        effective_date || new Date().toISOString().split('T')[0], 
        school_id || null
      ]
    );
    
    // Fetch the created fee with details
    const [createdFee] = await db.promise().query(
      `SELECT f.*, c.name as category_name, cl.name as class_name, s.name as school_name
       FROM fees f
       JOIN categories c ON f.category_id = c.id
       JOIN classes cl ON f.class_id = cl.id
       LEFT JOIN schools s ON f.school_id = s.id
       WHERE f.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json({ 
      message: 'Fee structure added successfully', 
      data: createdFee[0] 
    });
  } catch (err) {
    console.error('Error creating fee:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update an existing fee structure
 * @route PUT /api/fees/:id
 * @access Private (Admin)
 */
exports.updateFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      category_id, 
      class_id, 
      fee_type, 
      amount, 
      description, 
      effective_date,
      school_id 
    } = req.body;
    
    // Check if fee exists
    const [existing] = await db.promise().query(
      'SELECT id FROM fees WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }
    
    // Validate fee type if provided
    if (fee_type) {
      const validFeeTypes = ['registration', 'admission', 'tuition', 'exam'];
      if (!validFeeTypes.includes(fee_type)) {
        return res.status(400).json({ 
          error: `Fee type must be one of: ${validFeeTypes.join(', ')}` 
        });
      }
    }
    
    // Build update fields and values
    const updateFields = [];
    const updateValues = [];
    
    if (category_id) {
      updateFields.push('category_id = ?');
      updateValues.push(category_id);
    }
    
    if (class_id) {
      updateFields.push('class_id = ?');
      updateValues.push(class_id);
    }
    
    if (fee_type) {
      updateFields.push('fee_type = ?');
      updateValues.push(fee_type);
    }
    
    if (amount) {
      updateFields.push('amount = ?');
      updateValues.push(amount);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    
    if (effective_date) {
      updateFields.push('effective_date = ?');
      updateValues.push(effective_date);
    }
    
    if (school_id !== undefined) {
      updateFields.push('school_id = ?');
      updateValues.push(school_id);
    }
    
    // If no updates provided
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }
    
    // Add id to values array
    updateValues.push(id);
    
    // Execute update
    await db.promise().query(
      `UPDATE fees SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    res.json({ message: 'Fee structure updated successfully' });
  } catch (err) {
    console.error('Error updating fee:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a fee structure
 * @route DELETE /api/fees/:id
 * @access Private (Admin)
 */
exports.deleteFee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if fee exists
    const [existing] = await db.promise().query(
      'SELECT id FROM fees WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Fee structure not found' });
    }
    
    // Check if fee is being used in any payments
    const [usedInPayments] = await db.promise().query(
      'SELECT COUNT(*) as count FROM payments WHERE fee_id = ?',
      [id]
    );
    
    if (usedInPayments[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete fee structure that is being used in payments' 
      });
    }
    
    // Delete fee
    await db.promise().query('DELETE FROM fees WHERE id = ?', [id]);
    
    res.json({ message: 'Fee structure deleted successfully' });
  } catch (err) {
    console.error('Error deleting fee:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get outstanding fees for a student
 * @route GET /api/fees/outstanding/:studentId
 * @access Private
 */
exports.getOutstandingFees = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Validate student id
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    // Check if student exists
    const [student] = await db.promise().query(
      'SELECT id FROM students WHERE id = ?',
      [studentId]
    );
    
    if (student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get student class and category
    const [studentInfo] = await db.promise().query(
      'SELECT class_id, category_id FROM students WHERE id = ?',
      [studentId]
    );
    
    if (!studentInfo[0].class_id) {
      return res.status(400).json({ 
        error: 'Student does not have an assigned class' 
      });
    }
    
    // Get all applicable fees for student's class and category
    const [fees] = await db.promise().query(
      `SELECT f.*, c.name as category_name, cl.name as class_name, s.name as school_name
       FROM fees f
       JOIN categories c ON f.category_id = c.id
       JOIN classes cl ON f.class_id = cl.id
       LEFT JOIN schools s ON f.school_id = s.id
       WHERE f.category_id = ? AND f.class_id = ?`,
      [studentInfo[0].category_id, studentInfo[0].class_id]
    );
    
    // Get all payments made by student
    const [payments] = await db.promise().query(
      `SELECT SUM(amount_paid) as total_paid, fee_id
       FROM payments
       WHERE student_id = ?
       GROUP BY fee_id`,
      [studentId]
    );
    
    // Calculate outstanding amounts
    const outstandingFees = fees.map(fee => {
      const payment = payments.find(p => p.fee_id === fee.id);
      const totalPaid = payment ? payment.total_paid : 0;
      const outstanding = fee.amount - totalPaid;
      
      return {
        ...fee,
        total_paid: totalPaid,
        outstanding_amount: outstanding > 0 ? outstanding : 0,
        is_paid: outstanding <= 0
      };
    });
    
    // Filter to show only unpaid fees
    const unpaidFees = outstandingFees.filter(fee => fee.outstanding_amount > 0);
    
    res.json(unpaidFees);
  } catch (err) {
    console.error('Error fetching outstanding fees:', err);
    res.status(500).json({ error: err.message });
  }
};
