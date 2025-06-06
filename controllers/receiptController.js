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
      registration_id,
      payment_id, 
      receipt_type, 
      date_from, 
      date_to, 
      school_id 
    } = req.query;
    
    // Build the base query
let query = `
  SELECT r.*, 
         COALESCE(
           CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name),
           CONCAT(reg.first_name, ' ', COALESCE(reg.middle_name, ''), ' ', reg.last_name)
         ) AS student_name,
         c.name as class_name,
         CONCAT(u.full_name) as issued_by_name,
         sch.name as school_name,
         p.payment_date, p.amount_paid
  FROM receipts r
  LEFT JOIN students s ON r.student_id = s.id
  LEFT JOIN registrations reg ON r.registration_id = reg.id
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
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // fallback to default logo path if receipt.logo_url is missing
    const logoPath = receipt.logo_url || '/assets/logo.png';
    const logoSrc = logoPath.startsWith('http')
      ? logoPath
      : `${baseUrl}${logoPath}`;



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
      registration_id,
      payment_id, 
      receipt_type, 
      amount, 
      date_issued,
      venue,
      logo_url,
      exam_date,
      exam_id,
      school_id
    } = req.body;

    // Validate required fields
    if (!registration_id ) {
      return res.status(400).json({ error: 'Either registration_id is required' });
    }

    if (!receipt_type || !amount) {
      return res.status(400).json({ 
        error: 'Please provide receipt_type and amount' 
      });
    }

    // Validate receipt type
    const validReceiptTypes = ['registration', 'admission', 'tuition', 'exam'];
    if (!validReceiptTypes.includes(receipt_type)) {
      return res.status(400).json({ 
        error: `Receipt type must be one of: ${validReceiptTypes.join(', ')}` 
      });
    }

    // Verify payment if payment_id is provided
    if (payment_id) {
      const [paymentExists] = await db.promise().query(
        'SELECT id, student_id FROM payments WHERE id = ?',
        [payment_id]
      );

      if (paymentExists.length === 0) {
        return res.status(400).json({ error: 'Payment not found' });
      }

      if (student_id && paymentExists[0].student_id !== parseInt(student_id)) {
        return res.status(400).json({ error: 'Payment does not belong to the specified student' });
      }

      const [existingReceipt] = await db.promise().query(
        'SELECT id FROM receipts WHERE payment_id = ?',
        [payment_id]
      );

      if (existingReceipt.length > 0) {
        return res.status(400).json({ error: 'A receipt already exists for this payment' });
      }
    }

    // Set defaults
    const today = new Date().toISOString().split('T')[0];
    const receiptDate = date_issued || today;
    const issued_by = req.user ? req.user.id : null;
const baseUrl = `${req.protocol}://${req.get('host')}`;
const DEFAULT_LOGO = `${baseUrl}/assets/logo.png`;





    // Insert receipt
    const [result] = await db.promise().query(
      `INSERT INTO receipts 
       (registration_id, payment_id, receipt_type, amount, issued_by, date_issued, venue, logo_url, exam_date, exam_id, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registration_id || null,
        payment_id || null,
        receipt_type,
        amount,
        issued_by,
        receiptDate,
        venue || null,
        logo_url || DEFAULT_LOGO,
        exam_date || null,
        exam_id || null,
        school_id || null
      ]
    );

    // Fetch created receipt with joined name (from student OR registration)
    const [receipt] = await db.promise().query(
      `SELECT r.*, 
        COALESCE(
          CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name),
          CONCAT(reg.first_name, ' ', COALESCE(reg.middle_name, ''), ' ', reg.last_name)
        ) as student_name,
        c.name as class_name,
        sch.name as school_name
       FROM receipts r
       LEFT JOIN students s ON r.student_id = s.id
       LEFT JOIN registrations reg ON r.registration_id = reg.id
       LEFT JOIN classes c ON r.class_id = c.id
       LEFT JOIN schools sch ON r.school_id = sch.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    // (Optional: validate exam_id)
    if (exam_id) {
      const [examRes] = await db.promise().query(
        `SELECT e.*, c.name as class_name, cat.name as category_name 
         FROM exams e 
         LEFT JOIN classes c ON e.class_id = c.id
         LEFT JOIN categories cat ON e.category_id = cat.id
         WHERE e.id = ?`,
        [exam_id]
      );

      if (examRes.length === 0) {
        return res.status(400).json({ error: 'Exam not found' });
      }
    }

    // Format response
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
     reg.first_name AS reg_first_name, reg.middle_name AS reg_middle_name, reg.last_name AS reg_last_name,
     COALESCE(
       CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name),
       CONCAT(reg.first_name, ' ', COALESCE(reg.middle_name, ''), ' ', reg.last_name)
     ) AS student_name,
      COALESCE(c.name, class_apply.name) AS class_name,
     CONCAT(u.full_name) AS issued_by_name,
     sch.name AS school_name, 
     sch.address AS school_address, 
     sch.phone_number AS school_phone,
     p.payment_date, 
     p.amount_paid, 
     e.name AS exam_name, 
     e.date AS exam_date, 
     c.name AS class_name,
     e.venue AS exam_venue, 
     cat.name AS category_name
   FROM receipts r
   LEFT JOIN students s ON r.student_id = s.id
   LEFT JOIN registrations reg ON r.registration_id = reg.id
   LEFT JOIN exams e ON r.exam_id = e.id
   LEFT JOIN classes c ON c.id = COALESCE(r.class_id, e.class_id)
   LEFT JOIN classes class_apply ON class_apply.id = reg.class_applying_for
   LEFT JOIN users u ON r.issued_by = u.id
   LEFT JOIN categories cat ON e.category_id = cat.id
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
    

const logoSrc = receipt.logo_url?.startsWith('http')
  ? receipt.logo_url
  : receipt.logo_url
    ? `${baseUrl}${receipt.logo_url}`
    : DEFAULT_LOGO;

    // Create HTML template
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt #R-${receipt.id.toString().padStart(6, '0')}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      background: #fff;
      padding: 40px;
      font-size: 14px;
      color: #333;
    }

    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 30px 40px;
      border: 1px solid #ccc;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo {
      height: 90px;
      margin-bottom: 10px;
    }

    .school-name {
      font-size: 22px;
      font-weight: 600;
    }

    .section-title {
      font-size: 16px;
      font-weight: bold;
      border-bottom: 1px solid #999;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 5px;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .info-table td {
      padding: 6px 0;
      vertical-align: top;
    }

    .info-table .label {
      font-weight: 500;
      width: 200px;
      color: #555;
    }

    .amount-section {
      margin-top: 10px;
    }

    .amount-label {
      font-weight: bold;
      font-size: 16px;
    }

    .amount-value {
      font-size: 18px;
      font-weight: bold;
      margin-left: 10px;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }

    .signature-block {
      width: 40%;
      text-align: center;
    }

    .signature-line {
      border-top: 1px solid #000;
      margin-top: 60px;
      margin-bottom: 10px;
    }

    .print-btn {
      text-align: center;
      margin-top: 40px;
    }

    @media print {
      .print-btn {
        display: none;
      }
      body {
        margin: 0;
        padding: 0;
        background: none;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <img src="${logoSrc}" class="logo" alt="School Logo" />
      <div class="school-name">${receipt.school_name || 'School Management System'}</div>
      <div>${receipt.school_address || ''}</div>
      <div>${receipt.school_phone ? `Tel: ${receipt.school_phone}` : ''}</div>
      <h2 style="margin-top: 20px;">${receipt.receipt_type.toUpperCase()} RECEIPT</h2>
    </div>

    <div class="section">
      <div class="section-title">Receipt Information</div>
      <table class="info-table">
        <tr><td class="label">Receipt No:</td><td>R-${receipt.id.toString().padStart(6, '0')}</td></tr>
        <tr><td class="label">Date Issued:</td><td>${formattedDate}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Recipient Information</div>
      <table class="info-table">
        <tr><td class="label">Name:</td><td>${receipt.student_name}</td></tr>
        <tr><td class="label">Class:</td><td>${receipt.class_name || ''}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Payment Details</div>
      <table class="info-table">
        <tr><td class="label">Receipt Type:</td><td>${receipt.receipt_type.charAt(0).toUpperCase() + receipt.receipt_type.slice(1)}</td></tr>
        ${receipt.payment_date ? `<tr><td class="label">Payment Date:</td><td>${new Date(receipt.payment_date).toLocaleDateString('en-US')}</td></tr>` : ''}
        <tr>
          <td class="label amount-label">Amount:</td>
          <td class="amount-value">GHC ${parseFloat(receipt.amount).toFixed(2)}</td>
        </tr>
        <tr><td class="label">Amount in Words:</td><td>${amountInWords} cedis only</td></tr>
      </table>
    </div>

    ${receipt.receipt_type === 'registration' ? `
      <div class="section">
        <div class="section-title">Exam Details</div>
        <table class="info-table">
          <tr><td class="label">Exam:</td><td>${receipt.exam_name || '3GS.E.C. Exams'}</td></tr>
          <tr><td class="label">Category:</td><td>${receipt.category_name || ''}</td></tr>
          <tr><td class="label">Venue:</td><td>${receipt.exam_venue || ''}</td></tr>
          <tr><td class="label">Exam Date:</td><td>${receipt.exam_date ? new Date(receipt.exam_date).toLocaleDateString('en-US') : ''}</td></tr>
        </table>
      </div>
    ` : ''}

    <div class="signatures">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div>Issued By: ${receipt.issued_by_name || '____________'}</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div>Received By</div>
      </div>
    </div>

    <div class="print-btn">
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
