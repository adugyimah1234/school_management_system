const db = require("../config/db"); // Database connection
const crypto = require("crypto");
const commService = require('../services/communicationService');
const logger = require("../utils/logger");

/**
 * Utility function to convert numbers to words for receipt amounts
 */
function numberToWords(num) {
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const scales = ["", "thousand", "million", "billion", "trillion"];

  if (num === 0) return "zero";
  if (num < 0) return "negative " + numberToWords(Math.abs(num));

  const numStr = num.toString();
  const decimalIndex = numStr.indexOf(".");
  let words = "";

  const wholeNum = decimalIndex !== -1 ? parseInt(numStr.slice(0, decimalIndex)) : num;

  function convertChunk(n) {
    let result = "";
    if (n >= 100) { result += ones[Math.floor(n / 100)] + " hundred "; n %= 100; }
    if (n >= 20) { result += tens[Math.floor(n / 10)] + " "; n %= 10; }
    if (n > 0) { result += ones[n] + " "; }
    return result;
  }

  let chunkIndex = 0;
  let tempNum = wholeNum;
  while (tempNum > 0) {
    const chunk = tempNum % 1000;
    if (chunk !== 0) { words = convertChunk(chunk) + scales[chunkIndex] + " " + words; }
    tempNum = Math.floor(tempNum / 1000);
    chunkIndex++;
  }

  if (decimalIndex !== -1) {
    const decimal = numStr.slice(decimalIndex + 1);
    words = words.trim() + " point ";
    for (let i = 0; i < decimal.length; i++) { words += ones[parseInt(decimal[i])] + " "; }
  }

  return words.trim();
}

exports.getAllReceipts = async (req, res) => {
  try {
    const { student_id, registration_id, payment_id, receipt_type, date_from, date_to, school_id } = req.query;

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
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT(\u0027id\u0027, ri2.id, \u0027receipt_type\u0027, ri2.receipt_type, \u0027amount\u0027, ri2.amount))
           FROM receipt_items ri2 WHERE ri2.receipt_id = r.id),
          JSON_ARRAY()
        ) AS receipt_items
      FROM receipts r
        LEFT JOIN students s ON r.student_id = s.id
        LEFT JOIN registrations reg ON r.registration_id = reg.id
        LEFT JOIN classes c ON r.class_id = c.id
        LEFT JOIN users u ON r.issued_by = u.id
        LEFT JOIN schools sch ON r.school_id = sch.id
    `;

    const whereConditions = [];
    const queryParams = [];

    if (student_id) { whereConditions.push('r.student_id = ?'); queryParams.push(student_id); }
    if (registration_id) { whereConditions.push('r.registration_id = ?'); queryParams.push(registration_id); }
    if (payment_id) { whereConditions.push('r.payment_id = ?'); queryParams.push(payment_id); }
    if (receipt_type) { whereConditions.push('EXISTS (SELECT 1 FROM receipt_items ri3 WHERE ri3.receipt_id = r.id AND ri3.receipt_type = ?)'); queryParams.push(receipt_type); }
    if (date_from) { whereConditions.push('r.date_issued >= ?'); queryParams.push(date_from); }
    if (date_to) { whereConditions.push('r.date_issued <= ?'); queryParams.push(date_to); }
    if (school_id) { whereConditions.push('r.school_id = ?'); queryParams.push(school_id); }

    if (req.user && req.user.role !== 'superadmin' && req.user.role !== 'super_admin') {
      const normalizedRole = (req.user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

      if (normalizedRole === 'garrisondirector' || normalizedRole === 'admin') {
        // Garrison level overview
        if (req.user.garrison_id) {
          whereConditions.push('r.garrison_id = ?');
          queryParams.push(req.user.garrison_id);
        }
      } else {
        // School level or restricted access
        if (req.user.school_id) {
          whereConditions.push('r.school_id = ?');
          queryParams.push(req.user.school_id);
        } else if (req.user.garrison_id) {
          whereConditions.push('r.garrison_id = ?');
          queryParams.push(req.user.garrison_id);
        }
      }
    }

    if (whereConditions.length > 0) { query += ` WHERE ${whereConditions.join(' AND ')}`; }
    query += ` ORDER BY r.date_issued DESC`;

    const [receipts] = await db.query(query, queryParams);
    res.json(receipts);
  } catch (err) {
    logger.error('Error fetching receipts: ' + err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
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
        cat.name AS category_name
      FROM receipts r
        LEFT JOIN students s ON r.student_id = s.id
        LEFT JOIN registrations reg ON r.registration_id = reg.id
        LEFT JOIN assessments e ON r.assessment_id = e.id
        LEFT JOIN classes c ON c.id = COALESCE(r.class_id, e.class_id)
        LEFT JOIN classes class_apply ON class_apply.id = reg.class_applying_for
        LEFT JOIN users u ON r.issued_by = u.id
        LEFT JOIN categories cat ON e.category_id = cat.id
        LEFT JOIN schools sch ON r.school_id = sch.id
      WHERE r.id = ?`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Receipt not found" });

    const receipt = result[0];
    const [items] = await db.query(`SELECT id, receipt_type, amount FROM receipt_items WHERE receipt_id = ?`, [id]);

    // Fetch dynamic logo
    const [[logoSetting]] = await db.query('SELECT setting_value FROM settings WHERE setting_key = "institutional_logo"');
    const logoUrl = logoSetting ? logoSetting.setting_value : "/logo.png";

    res.json({
      ...receipt,
      logo_url: logoUrl,
      receipt_items: items,
      is_official: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createReceipt = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { registration_id, student_id, receipt_type, date_issued, school_id, class_id } = req.body;

    if (!Array.isArray(receipt_type) || receipt_type.length === 0) {
      return res.status(400).json({ error: "At least one receipt type is required." });
    }

    const totalAmount = receipt_type.reduce((sum, item) => sum + Number(item.amount), 0);
    const issued_by = req.user ? req.user.id : null;
    const receiptDate = date_issued || new Date().toISOString().split("T")[0];

    await connection.beginTransaction();
    const receiptId = crypto.randomUUID();

    await connection.query(
      `INSERT INTO receipts 
        (id, registration_id, student_id, issued_by, date_issued, school_id, garrison_id, class_id, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptId,
        registration_id || null,
        student_id || null,
        issued_by,
        receiptDate,
        school_id || (req.user ? req.user.school_id : null),
        req.user ? req.user.garrison_id : null,
        class_id || null,
        totalAmount
      ]
    );

    for (const item of receipt_type) {
      await connection.query(
        `INSERT INTO receipt_items (id, receipt_id, receipt_type, amount) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), receiptId, item.type, item.amount]
      );
    }

    if (receipt_type.some(rt => rt.type === "registration") && registration_id) {
      await connection.query(`UPDATE registrations SET payment_status = 'paid' WHERE id = ?`, [registration_id]);
    }

    await connection.commit();

    // Trigger Notifications
    this.triggerReceiptNotifications(receiptId);

    res.status(201).json({
      success: true,
      message: "Receipt generated successfully",
      data: { id: receiptId, amount: totalAmount }
    });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.triggerReceiptNotifications = async (receiptId) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, COALESCE(s.first_name, reg.first_name) as first_name,
            COALESCE(s.last_name, reg.last_name) as last_name,
            COALESCE(p.phone_number, reg.phone_number) as phone,
            COALESCE(p.email, reg.email) as email,
            sch.name as school_name
            FROM receipts r
            LEFT JOIN students s ON r.student_id = s.id
            LEFT JOIN registrations reg ON r.registration_id = reg.id
            LEFT JOIN parents p ON s.parent_id = p.id
            LEFT JOIN schools sch ON r.school_id = sch.id
            WHERE r.id = ?
        `, [receiptId]);

        const receipt = rows[0];
        if (!receipt) return;

        const commSettings = await commService.loadSettings().then(() => commService.settings);
        const amount = parseFloat(receipt.amount).toFixed(2);
        const message = `GARRISON SMS: Payment received for ${receipt.first_name} ${receipt.last_name}. Amount: GHS ${amount}. School: ${receipt.school_name}. Ref: R-${receiptId.substring(0,8).toUpperCase()}`;

        if (commSettings.enable_sms_receipts && receipt.phone) {
            await commService.sendSMS(receipt.phone, message);
        }

        if (commSettings.enable_email_receipts && receipt.email) {
            await commService.sendEmail(
                receipt.email,
                'Payment Receipt - Garrison Schools',
                message,
                `<h3>Payment Confirmation</h3><p>${message}</p>`
            );
        }
    } catch (err) {
        logger.error('Notification Trigger Error: ' + err.message);
    }
};

exports.getPrintableReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `SELECT r.*,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name)), ''), NULLIF(TRIM(CONCAT_WS(' ', reg.first_name, reg.middle_name, reg.last_name)), ''), 'N/A') AS student_name,
        c.name AS class_name,
        u.full_name AS issued_by_name,
        sch.name AS school_name,
        sch.address AS school_address,
        sch.phone_number AS school_phone,
        cat.name AS category_name
      FROM receipts r
        LEFT JOIN students s ON r.student_id = s.id
        LEFT JOIN registrations reg ON r.registration_id = reg.id
        LEFT JOIN classes c ON c.id = COALESCE(r.class_id, s.class_id, reg.class_applying_for)
        LEFT JOIN users u ON r.issued_by = u.id
        LEFT JOIN categories cat ON cat.id = COALESCE(s.category_id, reg.category_id)
        LEFT JOIN schools sch ON sch.id = COALESCE(s.school_id, r.school_id)
      WHERE r.id = ?`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Receipt not found" });

    const receipt = result[0];
    const [items] = await db.query(`SELECT id, receipt_type, amount FROM receipt_items WHERE receipt_id = ?`, [id]);

    // Branding Headers
    const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_group = "branding"');
    const branding = {};
    rows.forEach(r => { branding[r.setting_key] = r.setting_value; });

    const logoSrc = branding.institutional_logo ? `${req.protocol}://${req.get('host')}${branding.institutional_logo}` : `${req.protocol}://${req.get('host')}/logo.png`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt #R-${receipt.id.substring(0,8)}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #333; }
    .receipt-container { max-width: 400px; margin: 0 auto; padding: 30px; border: 1px solid #eee; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { height: 60px; margin-bottom: 10px; }
    .school-name { font-size: 18px; font-weight: 700; color: #1e293b; }
    .sub-header { font-size: 12px; color: #64748b; margin-bottom: 10px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px; }
    .item-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .total-box { margin-top: 20px; padding: 10px; background: #f8fafc; text-align: right; }
    .footer { font-size: 10px; text-align: center; margin-top: 30px; color: #94a3b8; font-style: italic; }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <img src="${logoSrc}" class="logo" />
      <div class="school-name">${branding.primary_header || receipt.school_name || "GARRISON SCHOOLS"}</div>
      <div class="sub-header">${branding.sub_header || "Headquarters Directorate"}</div>
      <div style="font-size: 14px; font-weight: 900; margin-top: 10px;">OFFICIAL RECEIPT</div>
    </div>

    <div class="section-title">Receipt Details</div>
    <div class="item-row"><span>Receipt No:</span><span style="font-family: monospace;">R-${receipt.id.substring(0,8).toUpperCase()}</span></div>
    <div class="item-row"><span>Date:</span><span>${new Date(receipt.date_issued).toLocaleDateString()}</span></div>

    <div class="section-title">Payer Info</div>
    <div class="item-row"><span>Name:</span><span style="font-weight: 700;">${receipt.student_name}</span></div>
    <div class="item-row"><span>Class:</span><span>${receipt.class_name}</span></div>

    <div class="section-title">Payment Breakdown</div>
    ${items.map(item => `<div class="item-row"><span>${item.receipt_type.toUpperCase()}</span><span style="font-weight: 600;">GHS ${parseFloat(item.amount).toFixed(2)}</span></div>`).join('')}

    <div class="total-box">
        <div style="font-size: 10px; font-weight: 700; color: #64748b;">TOTAL PAID</div>
        <div style="font-size: 20px; font-weight: 900; color: #059669;">GHS ${parseFloat(receipt.amount).toFixed(2)}</div>
    </div>

    <div class="footer">
        ${branding.footer_text || "Institutional generated document. Signature not required."}
    </div>
  </div>
</body>
</html>`;
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllReceipts: exports.getAllReceipts,
  getReceipt: exports.getReceipt,
  createReceipt: exports.createReceipt,
  getPrintableReceipt: exports.getPrintableReceipt,
};
