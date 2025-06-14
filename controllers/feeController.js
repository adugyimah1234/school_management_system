const db = require('../config/db'); // Database connection

/**
 * Get a specific fee by category and class level
 * @route GET /api/fees/get
 * @access Private
 */
exports.getFee = async (req, res) => {
  try {
    const [fees] = await db.query(
      'SELECT f.*, c.name as category_name, ay.year as academic_year FROM fees f ' +
      'LEFT JOIN categories c ON f.category_id = c.id ' +
      'LEFT JOIN academic_years ay ON f.academic_year_id = ay.id'
    );
    res.json(fees);
  } catch (err) {
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
    const [fees] = await db.query(query, queryParams);
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
    const [existing] = await db.query(
      'SELECT id FROM fees WHERE category_id = ? AND class_id = ? AND fee_type = ?',
      [category_id, class_id, fee_type]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Fee structure already exists for this category, class, and fee type' 
      });
    }
    
    // Insert new fee structure
    const [result] = await db.query(
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
    const [createdFee] = await db.query(
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
  const { id } = req.params;
  const { amount, category_id, academic_year_id, description } = req.body;

  if (!amount || !category_id || !academic_year_id) {
    return res.status(400).json({
      error: "Please provide all required fields: amount, category_id, academic_year_id"
    });
  }

  try {
    const [result] = await db.query(
      'UPDATE fees SET amount = ?, category_id = ?, academic_year_id = ?, description = ? WHERE id = ?',
      [amount, category_id, academic_year_id, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    res.json({ message: 'Fee updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a fee structure
 * @route DELETE /api/fees/:id
 * @access Private (Admin)
 */
exports.deleteFee = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM fees WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fee not found' });
    }

    res.json({ message: 'Fee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get outstanding fees for a student
 * @route GET /api/fees/outstanding/:studentId
 * @access Private
 */
exports.getOutstandingFees = async (req, res) => {
  const { studentId } = req.params;

  try {
    const [fees] = await db.query(
      `SELECT f.*, c.name as category_name, ay.year as academic_year,
       (f.amount - COALESCE(SUM(p.amount), 0)) as outstanding_amount
       FROM fees f
       LEFT JOIN categories c ON f.category_id = c.id
       LEFT JOIN academic_years ay ON f.academic_year_id = ay.id
       LEFT JOIN payments p ON f.id = p.fee_id AND p.student_id = ?
       GROUP BY f.id
       HAVING outstanding_amount > 0`,
      [studentId]
    );

    res.json(fees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
