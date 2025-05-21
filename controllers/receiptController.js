const db = require('../config/db'); // Database connection

/**
 * Utility function to convert numbers to words for receipt amounts
 * @param {number} num - The number to convert to words
 * @returns {string} - The number in words
 */
function numberToWords(num) {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const scales = ['', 'thousand', 'million', 'billion', 'trillion'];

  // Handle edge cases
  if (num === 0) return 'zero';
  if (num < 0) return 'negative ' + numberToWords(Math.abs(num));

  // Convert to string and handle decimals
  const numStr = num.toString();
  const decimalIndex = numStr.indexOf('.');
  let words = '';
  
  // Process whole number part
  const wholeNum = decimalIndex !== -1 ? parseInt(numStr.slice(0, decimalIndex)) : num;
  
  // Convert whole number to words
  function convertChunk(n) {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  }
  
  // Process number in chunks of 3 digits
  let chunkIndex = 0;
  let tempNum = wholeNum;
  
  while (tempNum > 0) {
    const chunk = tempNum % 1000;
    
    if (chunk !== 0) {
      words = convertChunk(chunk) + scales[chunkIndex] + ' ' + words;
    }
    
    tempNum = Math.floor(tempNum / 1000);
    chunkIndex++;
  }
  
  // Process decimal part if exists
  if (decimalIndex !== -1) {
    const decimal = numStr.slice(decimalIndex + 1);
    words = words.trim() + ' point ';
    
    for (let i = 0; i < decimal.length; i++) {
      words += ones[parseInt(decimal[i])] + ' ';
    }
  }
  
  return words.trim();
}

/**
 * Get all receipts with optional filters
 * @route GET /api/fees/receipts
 * @access Private
 */
exports.getAllReceipts = async (req, res) => {
  try {
    const { 
      student_id, 
      payment_id, 
      receipt_type, 
      date_from, 
      date_to, 
      school_id 
    } = req.query;
    
    // Build the base query
    let query = `
      SELECT r.*, 
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             c.name as class_name,
             CONCAT(u.full_name) as issued_by_name,
             sch.name as school_name,
             p.payment_date, p.amount_paid
      FROM receipts r
      JOIN students s ON r.student_id = s.id
      LEFT JOIN classes c ON r.class_id = c.id
      LEFT JOIN users u ON r.issued_by = u.id
      LEFT JOIN schools sch ON r.school_id = sch.id
      LEFT JOIN payments p ON r.payment_id = p.id
    `;
    
    const queryParams = [];
    const whereConditions = [];
    
    // Add filters if provided
    if (student_id) {
      whereConditions.push('r.student_id = ?');
      queryParams.push(student_id);
    }
    
    if (payment_id) {
      whereConditions.push('r.payment_id = ?');
      queryParams.push(payment_id);
    }
    
    if (receipt_type) {
      whereConditions.push('r.receipt_type = ?');
      queryParams.push(receipt_type);
    }
    
    if (date_from) {
      whereConditions.push('r.date_issued >= ?');
      queryParams.push(date_from);
    }
    
    if (date_to) {
      whereConditions.push('r.date_issued <= ?');
      queryParams.push(date_to);
    }
    
    if (school_id) {
      whereConditions.push('r.school_id = ?');
      queryParams.push(school_id);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add order by
    query += ' ORDER BY r.date_issued DESC';
    
    // Execute query
    const [receipts] = await db.promise().query(query, queryParams);
    res.json(receipts);
  } catch (err) {
    console.error('Error fetching receipts:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get a specific receipt by ID
 * @route GET /api/fees/receipts/:id
 * @access Private
 */
exports.getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate required parameters
    if (!id) {
      return res.status(400).json({ error: 'Receipt ID is required' });
    }
    
    // Query database for receipt with details
    const [result] = await db.promise().query(
      `SELECT r.*, 
             s.first_name, s.middle_name, s.last_name, s.admission_status,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             c.name as class_name, c.grade_level,
             CONCAT(u.full_name) as issued_by_name,
             sch.name as school_name, sch.address as school_address, sch.phone_number as school_phone,
             p.payment_date, p.amount_paid, p.installment_number,
             (SELECT fee_type FROM fees WHERE id = p.fee_id) as fee_type
       FROM receipts r
       JOIN students s ON r.student_id = s.id
       LEFT JOIN classes c ON r.class_id = c.id
       LEFT JOIN users u ON r.issued_by = u.id
       LEFT JOIN schools sch ON r.school_id = sch.id
       LEFT JOIN payments p ON r.payment_id = p.id
       WHERE r.id = ?`,
      [id]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    // Format data for official receipt view
    const receipt = result[0];
    
    // Format dates
    const dateIssued = new Date(receipt.date_issued);
    const formattedDate = dateIssued.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Format receipt for official documentation
    const formattedReceipt = {
      ...receipt,
      formatted_date: formattedDate,
      receipt_number: `R-${receipt.id.toString().padStart(6, '0')}`,
      is_official: true,
      document_type: `Official ${receipt.receipt_type.charAt(0).toUpperCase() + receipt.receipt_type.slice(1)} Receipt`
    };
    
    res.json(formattedReceipt);
  } catch (err) {
    console.error('Error fetching receipt:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a new receipt
 * @route POST /api/fees/receipts
 * @access Private
 */
exports.createReceipt = async (req, res) => {
  try {
    const { 
      student_id, 
      payment_id, 
      receipt_type, 
      amount, 
      date_issued,
      venue,
      logo_url,
      exam_date,
      class_id,
      school_id 
    } = req.body;
    
    // Validate required fields
    if (!student_id || !receipt_type || !amount) {
      return res.status(400).json({ 
        error: 'Please provide student_id, receipt_type, and amount' 
      });
    }
    
    // Check if student exists
    const [studentExists] = await db.promise().query(
      'SELECT id, class_id FROM students WHERE id = ?',
      [student_id]
    );
    
    if (studentExists.length === 0) {
      return res.status(400).json({ error: 'Student not found' });
    }
    
    // Validate receipt type
    const validReceiptTypes = ['registration', 'admission', 'tuition', 'exam'];
    if (!validReceiptTypes.includes(receipt_type)) {
      return res.status(400).json({ 
        error: `Receipt type must be one of: ${validReceiptTypes.join(', ')}` 
      });
    }
    
    // Set default values
    const today = new Date().toISOString().split('T')[0];
    const receiptDate = date_issued || today;
    
    // Get class ID from student if not provided
    const classId = class_id || studentExists[0].class_id;
    
    // Current user (from auth middleware)
    const issued_by = req.user ? req.user.id : null;
    
    // Verify payment if payment_id is provided
    if (payment_id) {
      const [paymentExists] = await db.promise().query(
        'SELECT id, student_id FROM payments WHERE id = ?',
        [payment_id]
      );
      
      if (paymentExists.length === 0) {
        return res.status(400).json({ error: 'Payment not found' });
      }
      
      if (paymentExists[0].student_id !== parseInt(student_id)) {
        return res.status(400).json({ error: 'Payment does not belong to the specified student' });
      }
      
      // Check if a receipt already exists for this payment
      const [existingReceipt] = await db.promise().query(
        'SELECT id FROM receipts WHERE payment_id = ?',
        [payment_id]
      );
      
      if (existingReceipt.length > 0) {
        return res.status(400).json({ error: 'A receipt already exists for this payment' });
      }
    }
    
    // Insert receipt record
    const [result] = await db.promise().query(
      `INSERT INTO receipts 
       (student_id, payment_id, receipt_type, amount, issued_by, date_issued, venue, logo_url, exam_date, class_id, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id, 
        payment_id || null, 
        receipt_type, 
        amount, 
        issued_by,
        receiptDate,
        venue || null,
        logo_url || null,
        exam_date || null,
        classId || null,
        school_id || null
      ]
    );
    
    // Get the created receipt with details
    const [receipt] = await db.promise().query(
      `SELECT r.*, 
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             c.name as class_name,
             sch.name as school_name
       FROM receipts r
       JOIN students s ON r.student_id = s.id
       LEFT JOIN classes c ON r.class_id = c.id
       LEFT JOIN schools sch ON r.school_id = sch.id
       WHERE r.id = ?`,
      [result.insertId]
    );
    
    // Format receipt number
    const receiptNumber = `R-${result.insertId.toString().padStart(6, '0')}`;
    
    res.status(201).json({ 
      message: 'Receipt generated successfully', 
      data: receipt[0],
      receipt_number: receiptNumber
    });
  } catch (err) {
    console.error('Error creating receipt:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Generate a printer-friendly HTML version of a receipt
 * @route GET /api/fees/receipts/:id/print
 * @access Private
 */
exports.getPrintableReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get receipt details
    const [result] = await db.promise().query(
      `SELECT r.*, 
             s.first_name, s.middle_name, s.last_name,
             CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
             c.name as class_name, c.grade_level,
             CONCAT(u.full_name) as issued_by_name,
             sch.name as school_name, sch.address as school_address, sch.phone_number as school_phone,
             p.payment_date, p.amount_paid
       FROM receipts r
       JOIN students s ON r.student_id = s.id
       LEFT JOIN classes c ON r.class_id = c.id
       LEFT JOIN users u ON r.issued_by = u.id
       LEFT JOIN schools sch ON r.school_id = sch.id
       LEFT JOIN payments p ON r.payment_id = p.id
       WHERE r.id = ?`,
      [id]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    const receipt = result[0];
    
    // Format dates
    const dateIssued = new Date(receipt.date_issued);
    const formattedDate = dateIssued.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Format amount in words
    const amountInWords = numberToWords(receipt.amount);
    
    // Create HTML template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #R-${receipt.id.toString().padStart(6, '0')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .receipt { border: 1px solid #000; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { max-width: 100px; max-height: 100px; }
          .title { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .school-info { margin-bottom: 20px; }
          .receipt-details { margin-bottom: 20px; }
          .student-details { margin-bottom: 20px; }
          .payment-details { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; }
          .row { display: flex; margin-bottom: 5px; }
          .label { font-weight: bold; width: 200px; }
          .value { flex: 1; }
          .amount { font-size: 18px; font-weight: bold; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature { width: 45%; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; display: inline-block; width: 80%; }
          @media print {
            body { margin: 0; }
            .receipt { border: none; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            ${receipt.logo_url ? `<img src="${receipt.logo_url}" class="logo" />` : ''}
            <div class="title">${receipt.school_name || 'School Management System'}</div>
            <div>${receipt.school_address || ''}</div>
            <div>${receipt.school_phone ? `Tel: ${receipt.school_phone}` : ''}</div>
            <h2>${receipt.receipt_type.toUpperCase()} RECEIPT</h2>
          </div>
          
          <div class="receipt-details">
            <div class="row">
              <div class="label">Receipt No:</div>
              <div class="value">R-${receipt.id.toString().padStart(6, '0')}</div>
            </div>
            <div class="row">
              <div class="label">Date:</div>
              <div class="value">${formattedDate}</div>
            </div>
          </div>
          
          <div class="student-details">
            <div class="row">
              <div class="label">Student Name:</div>
              <div class="value">${receipt.student_name}</div>
            </div>
            <div class="row">
              <div class="label">Class:</div>
              <div class="value">${receipt.class_name || ''} ${receipt.grade_level ? `(${receipt.grade_level})` : ''}</div>
            </div>
          </div>
          
          <div class="payment-details">
            <div class="row">
              <div class="label">Receipt Type:</div>
              <div class="value">${receipt.receipt_type.charAt(0).toUpperCase() + receipt.receipt_type.slice(1)}</div>
            </div>
            ${receipt.payment_date ? `
            <div class="row">
              <div class="label">Payment Date:</div>
              <div class="value">${new Date(receipt.payment_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</div>
            </div>` : ''}
            <div class="row">
              <div class="label">Amount:</div>
              <div class="value amount">$${parseFloat(receipt.amount).toFixed(2)}</div>
            </div>
            <div class="row">
              <div class="label">Amount in Words:</div>
              <div class="value">${amountInWords} dollars only</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="signature">
              <div class="signature-line"></div>
              <div>Issued By: ${receipt.issued_by_name || '_________________'}</div>
            </div>
            <div class="signature">
              <div class="signature-line"></div>
              <div>Received By</div>
            </div>
          </div>
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()">Print Receipt</button>
          </div>
        </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (err) {
    console.error('Error generating printable receipt:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add route to the router in routes/fees.js:
// router.get('/receipts/:id/print', protect, receiptController.getPrintableReceipt);

// Export all controller functions
module.exports = {
  getAllReceipts: exports.getAllReceipts,
  getReceipt: exports.getReceipt,
  createReceipt: exports.createReceipt,
  getPrintableReceipt: exports.getPrintableReceipt
};
