const db = require("../config/db"); // Database connection

/**
 * Utility function to convert numbers to words for receipt amounts
 * @param {number} num - The number to convert to words
 * @returns {string} - The number in words
 */
function numberToWords(num) {
  const ones = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const scales = ["", "thousand", "million", "billion", "trillion"];

  // Handle edge cases
  if (num === 0) return "zero";
  if (num < 0) return "negative " + numberToWords(Math.abs(num));

  // Convert to string and handle decimals
  const numStr = num.toString();
  const decimalIndex = numStr.indexOf(".");
  let words = "";

  // Process whole number part
  const wholeNum =
    decimalIndex !== -1 ? parseInt(numStr.slice(0, decimalIndex)) : num;

  // Convert whole number to words
  function convertChunk(n) {
    let result = "";

    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " hundred ";
      n %= 100;
    }

    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }

    if (n > 0) {
      result += ones[n] + " ";
    }

    return result;
  }

  // Process number in chunks of 3 digits
  let chunkIndex = 0;
  let tempNum = wholeNum;

  while (tempNum > 0) {
    const chunk = tempNum % 1000;

    if (chunk !== 0) {
      words = convertChunk(chunk) + scales[chunkIndex] + " " + words;
    }

    tempNum = Math.floor(tempNum / 1000);
    chunkIndex++;
  }

  // Process decimal part if exists
  if (decimalIndex !== -1) {
    const decimal = numStr.slice(decimalIndex + 1);
    words = words.trim() + " point ";

    for (let i = 0; i < decimal.length; i++) {
      words += ones[parseInt(decimal[i])] + " ";
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

    let query = `
      SELECT 
        r.*,
COALESCE(
  NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name)), ''),
  NULLIF(TRIM(CONCAT_WS(' ', reg.first_name, reg.middle_name, reg.last_name)), ''),
  'N/A'
) AS student_name,
        c.name AS class_name,
        CONCAT(u.full_name) AS issued_by_name,
        sch.name AS school_name,
        p.payment_date,
        p.amount_paid,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', ri.id,
            'receipt_type', ri.receipt_type,
            'amount', ri.amount
          )
        ) AS receipt_items
      FROM receipts r
        LEFT JOIN students s ON r.student_id = s.id
        LEFT JOIN registrations reg ON r.registration_id = reg.id
        LEFT JOIN classes c ON r.class_id = c.id
        LEFT JOIN users u ON r.issued_by = u.id
        LEFT JOIN schools sch ON r.school_id = sch.id
        LEFT JOIN payments p ON r.payment_id = p.id
        LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
    `;

    const whereConditions = [];
    const queryParams = [];

    if (student_id) {
      whereConditions.push('r.student_id = ?');
      queryParams.push(student_id);
    }

    if (registration_id) {
      whereConditions.push('r.registration_id = ?');
      queryParams.push(registration_id);
    }

    if (payment_id) {
      whereConditions.push('r.payment_id = ?');
      queryParams.push(payment_id);
    }

    if (receipt_type) {
      whereConditions.push('ri.receipt_type = ?');
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

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // ✅ Group and sort properly:
    query += `
      GROUP BY r.id
      ORDER BY r.date_issued DESC
    `;

    const [receipts] = await db.query(query, queryParams);

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

    if (!id) {
      return res.status(400).json({ error: "Receipt ID is required" });
    }

    // ✅ 1) Fetch parent receipt
    const [result] = await db.query(
      `SELECT r.*, 
        s.first_name, s.middle_name, s.last_name,
        reg.first_name AS reg_first_name, reg.middle_name AS reg_middle_name, reg.last_name AS reg_last_name,
COALESCE(
  NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name)), ''),
  NULLIF(TRIM(CONCAT_WS(' ', reg.first_name, reg.middle_name, reg.last_name)), ''),
  'N/A'
) AS student_name,
        COALESCE(c.name, class_apply.name) AS class_name,
        CONCAT(u.full_name) AS issued_by_name,
        sch.name AS school_name, 
        sch.address AS school_address, 
        sch.phone_number AS school_phone,
        p.payment_date, 
        p.amount_paid, 
        p.type AS payment_type,
        p.method AS payment_method,
        e.name AS exam_name, 
        e.date AS exam_date, 
        e.venue AS exam_venue, 
        cat.name AS category_name
      FROM receipts r
        LEFT JOIN students s ON r.student_id = s.id
        LEFT JOIN registrations reg ON r.registration_id = reg.id
        LEFT JOIN payments p ON r.payment_id = p.id
        LEFT JOIN exams e ON r.exam_id = e.id
        LEFT JOIN classes c ON c.id = COALESCE(r.class_id, e.class_id)
        LEFT JOIN classes class_apply ON class_apply.id = reg.class_applying_for
        LEFT JOIN users u ON r.issued_by = u.id
        LEFT JOIN categories cat ON e.category_id = cat.id
        LEFT JOIN schools sch ON r.school_id = sch.id
      WHERE r.id = ?`,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const receipt = result[0];

    // ✅ 2) Fetch receipt_items for this receipt
    const [items] = await db.query(
      `SELECT id, receipt_type, amount FROM receipt_items WHERE receipt_id = ?`,
      [id]
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const logoPath = receipt.logo_url || "/assets/logo.png";
    const logoSrc = logoPath.startsWith("http")
      ? logoPath
      : `${baseUrl}${logoPath}`;

    const dateIssued = new Date(receipt.date_issued);
    const formattedDate = dateIssued.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const formattedReceipt = {
      ...receipt,
      formatted_date: formattedDate,
      receipt_number: `R-${receipt.id.toString().padStart(6, "0")}`,
      receipt_items: items, // ✅ include list of payment types
      is_official: true,
    };

    res.json(formattedReceipt);
  } catch (err) {
    console.error("Error fetching receipt:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a new receipt
 * @route POST /api/fees/receipts
 * @access Private
 */
exports.createReceipt = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      registration_id,
      student_id,
      payment_id,
      receipt_type, // ✅ Array [{ type, amount }]
      date_issued,
      venue,
      logo_url,
      exam_date,
      exam_id,
      school_id,
    } = req.body;

    if (!Array.isArray(receipt_type) || receipt_type.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one receipt type is required." });
    }

    if (
      receipt_type.some((rt) => ["registration", "admission"].includes(rt.type))
    ) {
      if (!registration_id) {
        return res
          .status(400)
          .json({
            error: "registration_id is required for registration/admission.",
          });
      }
    } else {
      if (!student_id) {
        return res.status(400).json({ error: "student_id is required." });
      }
    }

    // ✅ Calculate total amount
    const totalAmount = receipt_type.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    const issued_by = req.user ? req.user.id : null;
    const today = new Date().toISOString().split("T")[0];
    const receiptDate = date_issued || today;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const DEFAULT_LOGO = `${baseUrl}/assets/logo.png`;

    await connection.beginTransaction();

    // ✅ Insert parent receipt with total amount
    const [receiptResult] = await connection.query(
      `INSERT INTO receipts 
        (registration_id, student_id, payment_id, issued_by, date_issued, venue, logo_url, exam_date, exam_id, school_id, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registration_id || null,
        student_id || null,
        payment_id || null,
        issued_by,
        receiptDate,
        venue || null,
        logo_url || DEFAULT_LOGO,
        exam_date || null,
        exam_id || null,
        school_id || null,
        totalAmount,
      ]
    );

    const receiptId = receiptResult.insertId;

    // ✅ Insert receipt_items
    for (const item of receipt_type) {
      await connection.query(
        `INSERT INTO receipt_items (receipt_id, receipt_type, amount)
         VALUES (?, ?, ?)`,
        [receiptId, item.type, item.amount]
      );
    }

    // ✅ If this is a registration receipt, update registration payment_status to 'paid'
if (
  receipt_type.some((rt) => ["registration", "admission"].includes(rt.type)) &&
  registration_id
) {
  await connection.query(
    `UPDATE registrations SET payment_status = 'paid' WHERE id = ?`,
    [registration_id]
  );
}

    await connection.commit();

    // ✅ Fetch joined receipt + items
    const [items] = await connection.query(
      `SELECT receipt_type FROM receipt_items WHERE receipt_id = ?`,
      [receiptId]
    );

    const [receiptRow] = await connection.query(
      `SELECT r.*,
COALESCE(
  NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name)), ''),
  NULLIF(TRIM(CONCAT_WS(' ', reg.first_name, reg.middle_name, reg.last_name)), ''),
  'N/A'
) AS student_name,
         c.name AS class_name,
         sch.name AS school_name,
         CONCAT(u.full_name) AS issued_by_name
       FROM receipts r
         LEFT JOIN students s ON r.student_id = s.id
         LEFT JOIN registrations reg ON r.registration_id = reg.id
         LEFT JOIN classes c ON r.class_id = c.id
         LEFT JOIN schools sch ON r.school_id = sch.id
         LEFT JOIN users u ON r.issued_by = u.id
       WHERE r.id = ?`,
      [receiptId]
    );

    const receiptNumber = `R-${receiptId.toString().padStart(6, "0")}`;

    res.status(201).json({
      message: "Receipt generated successfully",
      receipt_number: receiptNumber,
      data: {
        ...receiptRow[0],
        receipt_items: items,
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error creating receipt:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
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

    // ✅ 1) Correct joins for all student/registration/exam fallback
const [result] = await db.query(
  `
  SELECT r.*, 
COALESCE(
  NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name)), ''),
  NULLIF(TRIM(CONCAT_WS(' ', reg.first_name, reg.middle_name, reg.last_name)), ''),
  'N/A'
) AS student_name,
    c.name AS class_name,
    CONCAT(u.full_name) AS issued_by_name,
    sch.name AS school_name,
    sch.address AS school_address,
    sch.phone_number AS school_phone,
    p.payment_date,
    p.amount_paid,
    e.name AS exam_name,
    e.date AS exam_date,
    e.venue AS exam_venue,
    cat.name AS category_name
  FROM receipts r
    LEFT JOIN students s ON r.student_id = s.id
    LEFT JOIN registrations reg ON r.registration_id = reg.id
    LEFT JOIN payments p ON r.payment_id = p.id
    LEFT JOIN exams e ON r.exam_id = e.id
    LEFT JOIN classes c ON c.id = COALESCE(r.class_id, s.class_id, reg.class_applying_for, e.class_id)
    LEFT JOIN users u ON r.issued_by = u.id
    LEFT JOIN categories cat ON cat.id = COALESCE(s.category_id, e.category_id)
    LEFT JOIN schools sch ON sch.id = COALESCE(s.school_id, r.school_id)
  WHERE r.id = ?
  `,
  [id]
);


    if (result.length === 0) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const receipt = result[0];

    // ✅ 2) Get receipt_items
    const [items] = await db.query(
      `SELECT id, receipt_type FROM receipt_items WHERE receipt_id = ?`,
      [id]
    );
    receipt.receipt_items = items;

    // ✅ 3) Format date & words
    const dateIssued = new Date(receipt.date_issued);
    const formattedDate = dateIssued.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const amountInWords = numberToWords(receipt.amount);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoSrc = receipt.logo_url?.startsWith("http")
      ? receipt.logo_url
      : receipt.logo_url
      ? `${baseUrl}${receipt.logo_url}`
      : DEFAULT_LOGO;

      const hasRegistration = receipt.receipt_items?.some(item => item.receipt_type === 'registration');

    // ✅ 4) Full HTML with updated styling
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt #R-${receipt.id.toString().padStart(6, "0")}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      background: #fff;
      font-size: 14px;
      color: #333;
      position: relative;
    }

    .receipt-container {
      max-width: 300px;
      width: 130%;
      margin: 0 auto;
      padding: 40px;
      border: 1px solid #ccc;
      position: relative;
      background: #fff;
      z-index: 1;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo {
      text-align: center;
      height: 80px;
      margin-bottom: 10px;
    }

    .school-name {
      font-size: 24px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 400px;
      transform: translate(-50%, -50%) rotate(-30deg);
      opacity: 0.05;
      z-index: 0;
      pointer-events: none;
      filter: grayscale(100%);
    }

    .text-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      opacity: 0.05;
      white-space: nowrap;
      z-index: 0;
      pointer-events: none;
      font-weight: 700;
    }

    .section-title {
      font-size: 16px;
      font-weight: bold;
      border-bottom: 1px solid #aaa;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 5px;
      text-transform: uppercase;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .info-table td {
      padding: 2px 0;
      vertical-align: top;
      white-space: nowrap;
    }

    .amount-label {
      font-weight: bold;
    }

    .amount-value {
      font-size: 18px;
      font-weight: bold;
      color: #2E6F40;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
    }

    .signature-block {
      width: 40%;
      text-align: center;
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
    <img src="${logoSrc}" class="watermark" alt="3 Garrison Schools Centre" />
    <div class="text-watermark">Official Receipt</div>

    <div class="header">
      <img src="${logoSrc}" class="logo" alt="School Logo" />
      <div class="school-name">${receipt.school_name || "3 GARRISON EDUCATION CENTRE"}</div>
      <div>${receipt.school_address || ""}</div>
      <div>${receipt.school_phone ? `Tel: ${receipt.school_phone}` : ""}</div>
      <h2 style="margin-top: 20px;">Official Receipt</h2>
    </div>

    <div class="section">
    <div class="section-title">Receipt Info</div>
      <table class="info-table">
        <tr><td class="label">Receipt No:</td><td>R-${receipt.id.toString().padStart(6, "0")}</td></tr>
        <tr><td class="label">Date Issued:</td><td>${formattedDate}</td></tr>
    </table>
    </div>

    <div class="section">
    <div class="section-title">Recipient Info</div>
      <table class="info-table">
        <tr><td class="label">Name:</td><td>${receipt.student_name}</td></tr>
      ${!hasRegistration ? `
<tr><td class="label">Category:</td><td>${receipt.category_name || ''}</td></tr>
<tr><td class="label">Class:</td><td>${receipt.class_name || ''}</td></tr>
<tr><td class="label">School:</td><td>${receipt.school_name || ''}</td></tr>
      ` : ''}

    </table>
    </div>

    <div class="section">
    <div class="section-title">Payment Options</div>
      <table class="info-table">
      ${receipt.receipt_items.map(item => `
        <tr>
            <td class="label">${item.receipt_type.charAt(0).toUpperCase() + item.receipt_type.slice(1)}</td>
            <td style="text-align: right; font-weight: bold; color: #2E6F40;">PAID</td>
          </tr>`).join("")}
    </table>
    </div>

    ${receipt.receipt_items.some(item => item.receipt_type === "registration") ? `
      <div class="section">
      <div class="section-title">Entrance Exam</div>
        <table class="info-table">
          <tr><td class="label">Venue:</td><td>3 Garrison Schools</td></tr>
          <tr><td class="label">Exam Date:</td><td>2 Aug 2025</td></tr>
          <tr><td class="label">Time:</td><td>0700hrs</td></tr>
      </table>
      </div>` : ""}

    <div class="signatures">
      <div class="signature-block">
        <div>Issued By:</div>
        <div>${receipt.issued_by_name}</div>
      </div>
      <div class="signature-block">
        <div class="label amount-label">Total Amount Paid:</div>
        <div class="amount-value">
          GHC ${parseFloat(receipt.amount).toFixed(2)}
        </div>
      </div>
    </div>

    <div style="margin-top: 30px; text-align: center; font-style: italic; font-weight: 500;">
      We appreciate your trust in 3 Garrison Education Centre. Wishing you continued success!
    </div>

    <div class="print-btn">
      <button onclick="window.print()">🖨️ Print Receipt</button>
    </div>
  </div>
</body>
</html>
`;

    res.send(html);

  } catch (err) {
    console.error("Error generating printable receipt:", err);
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
  getPrintableReceipt: exports.getPrintableReceipt,
};
