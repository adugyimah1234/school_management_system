const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const notificationController = require('./notificationController');

// Standard response wrapper for data consistency
const sendSuccess = (res, data, message) => res.json({ success: true, data, message });

// 1. Get Garrison Director Dashboard (Overview of schools under their garrison)
exports.getGarrisonOverview = async (req, res) => {
  try {
    const userGarrisonId = req.user.garrison_id;

    if (!userGarrisonId) {
      return res.status(400).json({ success: false, error: 'User is not assigned to any Garrison' });
    }

    // Get garrison details
    const [[garrison]] = await db.query('SELECT * FROM garrisons WHERE id = ?', [userGarrisonId]);
    if (!garrison) {
      return res.status(404).json({ success: false, error: 'Garrison not found' });
    }

    // Schools under this garrison
    const [schools] = await db.query(`
      SELECT 
        s.id AS school_id,
        s.name AS school_name,
        s.address,
        s.phone_number,
        s.email,
        (SELECT COUNT(*) FROM students WHERE school_id = s.id) AS total_students,
        (SELECT COUNT(*) FROM students WHERE school_id = s.id AND status = 'active') AS active_students,
        (SELECT COUNT(*) FROM users WHERE school_id = s.id) AS total_staff,
        (SELECT COALESCE(SUM(amount), 0) FROM receipts WHERE school_id = s.id) AS fee_collected,
        (
          SELECT COALESCE(SUM(f.amount), 0)
          FROM students st
          JOIN fees f ON st.class_id = f.class_id AND st.category_id = f.category_id
          WHERE st.school_id = s.id AND st.status = 'active'
        ) - (
          SELECT COALESCE(SUM(r.amount), 0)
          FROM receipts r
          JOIN students st ON r.student_id = st.id
          WHERE st.school_id = s.id AND st.status = 'active'
        ) AS pending_amount
      FROM schools s
      WHERE s.garrison_id = ?
      GROUP BY s.id, s.name, s.address, s.phone_number, s.email
    `, [userGarrisonId]);

    const processedSchools = schools.map(s => ({
        ...s,
        pending_amount: Math.max(0, parseFloat(s.pending_amount || 0))
    }));

    // Aggregate stats
    const totalSchools = schools.length;
    const totalStudents = schools.reduce((sum, sch) => sum + Number(sch.total_students || 0), 0);
    const totalFeeCollected = schools.reduce((sum, sch) => sum + Number(sch.fee_collected || 0), 0);

    sendSuccess(res, {
      garrison,
      summary: {
        totalSchools,
        totalStudents,
        totalFeeCollected,
      },
      schools: processedSchools,
    });
  } catch (error) {
    console.error('Garrison Director Overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to load garrison overview' });
  }
};

// 2. Garrison Director creates a new school under their Garrison
exports.createSchoolForGarrison = async (req, res) => {
  const userGarrisonId = req.user.garrison_id;
  const { name, address, phone_number, email } = req.body;

  if (!name || !address) {
    return res.status(400).json({ success: false, error: 'School name and address are required' });
  }

  if (!userGarrisonId) {
    return res.status(400).json({ success: false, error: 'Director is not assigned to a Garrison' });
  }

  try {
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO schools (id, name, address, phone_number, email, garrison_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, address, phone_number || null, email || null, userGarrisonId]
    );

    // Create notification for Super Admins and this Garrison
    await notificationController.createNotification({
      title: 'New School Unit Registered',
      message: `${name} has been added to your Garrison Command.`,
      type: 'success',
      garrison_id: userGarrisonId
    });

    sendSuccess(res, { id }, 'School created successfully under your Garrison');
  } catch (error) {
    console.error('Error creating school for garrison:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Garrison Director lists schools under their Garrison
exports.getGarrisonSchools = async (req, res) => {
  try {
    const userGarrisonId = req.user.garrison_id;

    if (!userGarrisonId) {
      return res.status(400).json({ success: false, error: 'Director is not assigned to a Garrison' });
    }

    const [schools] = await db.query(`
      SELECT 
        s.*,
        COUNT(DISTINCT st.id) AS student_count
      FROM schools s
      LEFT JOIN students st ON st.school_id = s.id
      WHERE s.garrison_id = ?
      GROUP BY s.id
      ORDER BY s.name ASC
    `, [userGarrisonId]);

    sendSuccess(res, schools);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Garrison Director creates a School Admin (`admin`) for a school under their Garrison
exports.createSchoolAdmin = async (req, res) => {
  const userGarrisonId = req.user.garrison_id;
  const { full_name, username, email, password, school_id } = req.body;

  if (!full_name || !username || !password || !school_id) {
    return res.status(400).json({ success: false, error: 'Full name, username, password, and school ID are required' });
  }

  try {
    // Verify school belongs to this director's garrison
    const [schoolRows] = await db.query('SELECT id FROM schools WHERE id = ? AND garrison_id = ?', [school_id, userGarrisonId]);
    if (schoolRows.length === 0) {
      return res.status(403).json({ success: false, error: 'Selected school does not belong to your Garrison' });
    }

    // Check if username already exists
    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already registered' });
    }

    // Get school_admin role_id
    const [roleRows] = await db.query('SELECT id FROM roles WHERE name = ?', ['school_admin']);
    if (roleRows.length === 0) {
      return res.status(500).json({ success: false, error: 'School Admin role not found. Please ensure migration has run.' });
    }
    const schoolAdminRoleId = roleRows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    await db.query(`
      INSERT INTO users (id, full_name, username, email, password, role_id, school_id, garrison_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, full_name, username, email || null, hashedPassword, schoolAdminRoleId, school_id, userGarrisonId]);

    // Create notification
    await notificationController.createNotification({
      title: 'Administrator Provisioned',
      message: `${full_name} has been assigned as Administrator for School ID ${school_id}.`,
      type: 'info',
      garrison_id: userGarrisonId,
      school_id: school_id
    });

    sendSuccess(res, { id }, 'School Administrator account created successfully');
  } catch (error) {
    console.error('Error creating School Admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
