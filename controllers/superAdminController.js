const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const notificationController = require('./notificationController');

// Standard response wrapper for data consistency
const sendSuccess = (res, data, message) => res.json({ success: true, data, message });

// 1. Get Executive Network Dashboard & School Performance Metrics
exports.getExecutiveOverview = async (req, res) => {
  try {
    const [[garrisonCount]] = await db.query('SELECT COUNT(*) AS total FROM garrisons');
    const [[schoolCount]] = await db.query('SELECT COUNT(*) AS total FROM schools');
    const [[studentCount]] = await db.query('SELECT COUNT(*) AS total FROM students');
    const [[directorCount]] = await db.query(
      "SELECT COUNT(*) AS total FROM users JOIN roles ON users.role_id = roles.id WHERE roles.name IN ('admin', 'garrison_director')"
    );

    // Filter for only Institutional Fees (Exclude books, uniforms, furniture)
    const institutionalTypes = ["'registration'", "'levy'", "'Fee'"].join(",");

    const [[financials]] = await db.query(`
        SELECT COALESCE(SUM(ri.amount), 0) AS totalCollections
        FROM receipt_items ri
        WHERE ri.receipt_type IN (${institutionalTypes})
    `);

    // Revenue by Student Category (CIV, MOD, SVC)
    const [categoryRevenue] = await db.query(`
        SELECT
            c.name as category,
            SUM(ri.amount) as total
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.id
        LEFT JOIN students s ON r.student_id = s.id
        LEFT JOIN registrations reg ON r.registration_id = reg.id
        LEFT JOIN categories c ON (c.id = s.category_id OR c.name = reg.category)
        WHERE ri.receipt_type IN (${institutionalTypes})
        GROUP BY c.name
    `);

    const [garrisonsPerformance] = await db.query(`
      SELECT
        g.id AS garrison_id,
        g.name AS garrison_name,
        g.code,
        g.location,
        (SELECT COUNT(*) FROM schools WHERE garrison_id = g.id) AS total_schools,
        (SELECT COUNT(*) FROM students st JOIN schools sch ON st.school_id = sch.id WHERE sch.garrison_id = g.id) AS total_students,
        (
          SELECT GROUP_CONCAT(u.full_name SEPARATOR ', ')
          FROM users u
          JOIN roles r ON u.role_id = r.id
          WHERE u.garrison_id = g.id AND r.name IN ('admin', 'garrison_director')
        ) AS director_name,
        (
          SELECT COALESCE(SUM(ri.amount), 0)
          FROM receipt_items ri
          JOIN receipts r ON ri.receipt_id = r.id
          LEFT JOIN students s ON r.student_id = s.id
          LEFT JOIN registrations reg ON r.registration_id = reg.id
          WHERE COALESCE(s.garrison_id, reg.garrison_id, r.garrison_id) = g.id
          AND ri.receipt_type IN (${institutionalTypes})
        ) AS total_collected
      FROM garrisons g
      GROUP BY g.id, g.name, g.code, g.location
    `);

    const [schoolsPerformance] = await db.query(`
      SELECT
        s.id AS school_id,
        s.name AS school_name,
        s.email,
        s.phone_number,
        g.name AS garrison_name,
        s.garrison_id,
        (SELECT COUNT(*) FROM students WHERE school_id = s.id) AS total_students,
        (SELECT COUNT(*) FROM students WHERE school_id = s.id AND status = 'active') AS active_students,
        (SELECT COUNT(*) FROM users WHERE school_id = s.id OR (school_id IS NULL AND garrison_id = s.garrison_id)) AS total_staff,
        (
          SELECT COALESCE(SUM(ri.amount), 0)
          FROM receipt_items ri
          JOIN receipts r ON ri.receipt_id = r.id
          LEFT JOIN students st ON r.student_id = st.id
          LEFT JOIN registrations reg ON r.registration_id = reg.id
          WHERE COALESCE(st.school_id, reg.school_id, r.school_id) = s.id
          AND ri.receipt_type IN (${institutionalTypes})
        ) AS fee_collected,
        (
          SELECT COALESCE(SUM(f.amount), 0)
          FROM students st
          JOIN fees f ON st.class_id = f.class_id AND st.category_id = f.category_id
          WHERE st.school_id = s.id AND st.status = 'active'
        ) - (
          SELECT COALESCE(SUM(ri.amount), 0)
          FROM receipt_items ri
          JOIN receipts r ON ri.receipt_id = r.id
          JOIN students st ON r.student_id = st.id
          WHERE st.school_id = s.id AND st.status = 'active'
          AND ri.receipt_type IN (${institutionalTypes})
        ) AS pending_amount
      FROM schools s
      LEFT JOIN garrisons g ON s.garrison_id = g.id
      ORDER BY total_students DESC
    `);

    const processedSchools = schoolsPerformance.map(school => ({
        ...school,
        pending_amount: Math.max(0, parseFloat(school.pending_amount || 0))
    }));

    sendSuccess(res, {
      summary: {
        totalGarrisons: garrisonCount.total || 0,
        totalSchools: schoolCount.total || 0,
        totalStudents: studentCount.total || 0,
        totalDirectors: directorCount.total || 0,
        totalCollections: financials?.totalCollections || 0,
        categoryRevenue: categoryRevenue, // NEW: Strategic Revenue Breakdown
        pendingPayments: processedSchools.reduce((sum, s) => sum + s.pending_amount, 0),
        outstandingBalance: processedSchools.reduce((sum, s) => sum + s.pending_amount, 0),
      },
      garrisonsPerformance,
      schoolsPerformance: processedSchools,
    });
  } catch (error) {
    logger.error('Super Admin Overview error: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to load executive overview' });
  }
};

// 2. Get all Garrisons with metrics & assigned directors
exports.getAllGarrisons = async (req, res) => {
  try {
    const [garrisons] = await db.query(`
      SELECT
        g.*,
        (SELECT COUNT(*) FROM schools WHERE garrison_id = g.id) AS school_count,
        (
          SELECT GROUP_CONCAT(u.full_name SEPARATOR ', ')
          FROM users u
          JOIN roles r ON u.role_id = r.id
          WHERE u.garrison_id = g.id AND r.name IN ('admin', 'garrison_director')
        ) AS director_name
      FROM garrisons g
      ORDER BY g.created_at DESC
    `);
    sendSuccess(res, garrisons);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Create a new Garrison
exports.createGarrison = async (req, res) => {
    const { name, code, location } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Garrison name is required' });
    try {
      const id = crypto.randomUUID();
      await db.query('INSERT INTO garrisons (id, name, code, location) VALUES (?, ?, ?, ?)', [id, name, code || null, location || null]);

      // Create notification
      await notificationController.createNotification({
        title: 'New Garrison Commissioned',
        message: `The Garrison "${name}" has been successfully added to the network.`,
        type: 'success'
      });

      sendSuccess(res, { id }, 'Garrison created successfully');
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// 3b. Update a Garrison
exports.updateGarrison = async (req, res) => {
    const { id } = req.params;
    const { name, code, location } = req.body;
    try {
      const [result] = await db.query(
        'UPDATE garrisons SET name = ?, code = ?, location = ? WHERE id = ?',
        [name, code, location, id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Garrison not found' });
      sendSuccess(res, null, 'Garrison updated successfully');
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// 3c. Delete a Garrison
exports.deleteGarrison = async (req, res) => {
    const { id } = req.params;
    try {
      const [[schoolCount]] = await db.query('SELECT COUNT(*) as total FROM schools WHERE garrison_id = ?', [id]);
      if (schoolCount.total > 0) {
        return res.status(400).json({ success: false, error: 'Cannot delete garrison with active school units.' });
      }
      const [result] = await db.query('DELETE FROM garrisons WHERE id = ?', [id]);
      sendSuccess(res, null, 'Garrison deleted successfully');
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// 4. Institutional Governance
exports.updateBranding = async (req, res) => {
  try {
    const { primary_header, sub_header, footer_text } = req.body;
    const logo = req.file ? `/uploads/branding/${req.file.filename}` : null;

    const queries = [
      { key: 'primary_header', value: primary_header },
      { key: 'sub_header', value: sub_header },
      { key: 'footer_text', value: footer_text },
    ];

    if (logo) queries.push({ key: 'institutional_logo', value: logo });

    for (const q of queries) {
      if (q.value !== undefined) {
        await db.query(
          'INSERT INTO settings (setting_group, setting_key, setting_value) VALUES ("branding", ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
          [q.key, JSON.stringify(q.value), JSON.stringify(q.value)]
        );
      }
    }
    sendSuccess(res, null, 'Institutional branding synchronized successfully.');
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getBranding = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_group = "branding"');
    const branding = {};
    rows.forEach(r => { branding[r.setting_key] = r.setting_value; });
    sendSuccess(res, branding);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateGradeGovernance = async (req, res) => {
    try {
        const { ca_weight, exam_weight, local_autonomy } = req.body;
        const settings = [
            { key: 'ca_weight', value: ca_weight },
            { key: 'exam_weight', value: exam_weight },
            { key: 'local_autonomy', value: local_autonomy }
        ];

        for (const s of settings) {
            if (s.value !== undefined) {
                await db.query(
                    'INSERT INTO settings (setting_group, setting_key, setting_value) VALUES ("grade_governance", ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                    [s.key, JSON.stringify(s.value), JSON.stringify(s.value)]
                );
            }
        }
        sendSuccess(res, null, 'Grade governance updated.');
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// 5. API Gateway
exports.regenerateApiToken = async (req, res) => {
    try {
        const newToken = `GAR_LIVE_${crypto.randomBytes(12).toString('hex')}`;
        await db.query(
            'INSERT INTO settings (setting_group, setting_key, setting_value) VALUES ("api_gateway", "master_token", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [JSON.stringify(newToken), JSON.stringify(newToken)]
        );
        sendSuccess(res, { token: newToken }, 'New master access token generated.');
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.getApiToken = async (req, res) => {
    try {
        const [[row]] = await db.query('SELECT setting_value FROM settings WHERE setting_key = "master_token"');
        sendSuccess(res, { token: row ? row.setting_value : null });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// 6. Profile
exports.updateAdminProfile = async (req, res) => {
    const { full_name, email, password } = req.body;
    try {
        let query = 'UPDATE users SET full_name = ?, email = ?';
        let params = [full_name, email];
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }
        query += ' WHERE id = ?';
        params.push(req.user.id);
        await db.query(query, params);
        sendSuccess(res, null, 'Profile updated successfully.');
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// 7. Communication Settings (Email & SMS)
exports.getCommunicationSettings = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM settings WHERE setting_group = "communication"');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    sendSuccess(res, settings);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCommunicationSettings = async (req, res) => {
  try {
    const settings = req.body; // Expecting an object of key-value pairs
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO settings (setting_group, setting_key, setting_value) VALUES ("communication", ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, JSON.stringify(value), JSON.stringify(value)]
      );
    }
    sendSuccess(res, null, 'Communication settings updated successfully.');
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getGarrisonDirectors = async (req, res) => {
    try {
      const [directors] = await db.query(`
        SELECT u.id, u.full_name, u.username, u.email, u.created_at, g.id AS garrison_id, g.name AS garrison_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN garrisons g ON u.garrison_id = g.id
        WHERE r.name IN ('admin', 'garrison_director')
        ORDER BY u.created_at DESC
      `);
      sendSuccess(res, directors);
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.createGarrisonDirector = async (req, res) => {
    const { full_name, username, email, password, garrison_id } = req.body;
    if (!full_name || !username || !password || !garrison_id) return res.status(400).json({ success: false, error: 'Missing fields' });
    try {
      const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existing.length > 0) return res.status(400).json({ success: false, error: 'Username taken' });
      const [roleRows] = await db.query("SELECT id FROM roles WHERE name IN ('admin', 'garrison_director') LIMIT 1");
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      await db.query('INSERT INTO users (id, full_name, username, email, password, role_id, garrison_id, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)', [id, full_name, username, email || null, hashedPassword, roleRows[0].id, garrison_id]);

      // Create notification for Super Admins
      await notificationController.createNotification({
        title: 'New Garrison Director Registered',
        message: `${full_name} has been assigned as a Director for Garrison ID ${garrison_id}.`,
        type: 'info'
      });

      sendSuccess(res, { id }, 'Director created');
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
