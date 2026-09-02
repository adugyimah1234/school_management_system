const db = require('../config/db');
const response = require('../utils/apiResponse');
const auditLogger = require('../utils/auditLogger');
const emailService = require('../utils/emailService');

exports.getAllSchools = async (req, res, next) => {
  try {
    const user = req.user;
    let query = 'SELECT * FROM schools';
    let params = [];

    if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
      if (user.garrison_id) {
        query += ' WHERE garrison_id = ?';
        params = [user.garrison_id];
      } else if (user.school_id) {
        query += ' WHERE id = ?';
        params = [user.school_id];
      }
    }

    const [schools] = await db.query(query, params);
    return response.success(res, schools);
  } catch (error) {
    next(error);
  }
};

exports.createSchool = async (req, res, next) => {
  const { name, address, phone_number, email } = req.body;
  if (!name || !address || !phone_number || !email) {
    return response.error(res, 'All fields are required', 400);
  }
  try {
    const user = req.user;
    const garrison_id = user ? user.garrison_id : null;
    const id = require('crypto').randomUUID();

    const [result] = await db.query(
      'INSERT INTO schools (id, name, address, phone_number, email, garrison_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, address, phone_number, email, garrison_id]
    );
    return response.success(res, { id }, 'School created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.updateSchool = async (req, res, next) => {
  const { id } = req.params;
  const { name, address, phone_number, email } = req.body;
  const user = req.user;

  // 🛡️ Security Check: Ensure user only edits their own school unless SuperAdmin
  if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
    if (user.school_id && user.school_id !== id) {
      return response.error(res, 'Unauthorized: You cannot edit other school units.', 403);
    }
  }

  try {
    const [result] = await db.query(
      'UPDATE schools SET name = ?, address = ?, phone_number = ?, email = ? WHERE id = ?',
      [name, address, phone_number, email, id]
    );
    if (result.affectedRows === 0) {
      return response.error(res, 'School not found', 404);
    }

    // 🛡️ Log the alteration
    await auditLogger.logAction({
      user_id: user?.id,
      action: 'UPDATE_SCHOOL_SETTINGS',
      target_type: 'school',
      target_id: id,
      changes: req.body,
      ip_address: req.ip
    });

    return response.success(res, null, 'School updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteSchool = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  // 🛡️ Security Check: Prevent deletion by non-superadmins
  if (user && user.role !== 'superadmin' && user.role !== 'super_admin') {
    return response.error(res, 'Unauthorized: Only SuperAdmins can decommission units.', 403);
  }

  try {
    // 🛡️ Get school name before deletion for the email
    const [[school]] = await db.query('SELECT name FROM schools WHERE id = ?', [id]);

    const [result] = await db.query('DELETE FROM schools WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return response.error(res, 'School not found', 404);
    }

    // 🛡️ Log the deletion
    await auditLogger.logAction({
      user_id: user?.id,
      action: 'DELETE_SCHOOL_UNIT',
      target_type: 'school',
      target_id: id,
      ip_address: req.ip
    });

    // 🛡️ Security Alert: Email SuperAdmins
    const [superAdmins] = await db.query(`
        SELECT u.email, u.full_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name IN ('superadmin', 'super_admin') AND u.email IS NOT NULL
    `);

    for (const admin of superAdmins) {
        await emailService.sendEmail({
            to: admin.email,
            subject: `🚨 CRITICAL SECURITY ALERT: School Unit Deleted`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 10px;">
                    <h2 style="color: #ef4444;">Critical Security Alert</h2>
                    <p>Hello <strong>${admin.full_name}</strong>,</p>
                    <p>A school unit has been decommissioned and deleted from the Nwoma network.</p>
                    <hr />
                    <p><strong>School Name:</strong> ${school?.name || 'Unknown'}</p>
                    <p><strong>Action By:</strong> ${user?.full_name || 'System'} (ID: ${user?.id})</p>
                    <p><strong>IP Address:</strong> ${req.ip}</p>
                    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    <hr />
                    <p style="color: #64748b; font-size: 12px;">This is an automated security alert. If you did not authorize this action, please investigate immediately.</p>
                </div>
            `
        });
    }

    return response.success(res, null, 'School deleted successfully');
  } catch (error) {
    next(error);
  }
};
