const db = require('../config/db');
const response = require('../utils/apiResponse');

// ✅ Get all classes
exports.getAllClasses = async (req, res, next) => {
  try {
    const user = req.user;
    const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
    let query = 'SELECT * FROM classes';
    let params = [];

    if (normalizedRole === 'superadmin') {
      // SuperAdmins see everything
    } else if (normalizedRole === 'garrisondirector' || normalizedRole === 'admin') {
      query += ' WHERE garrison_id = ?';
      params = [user.garrison_id];
    } else if (normalizedRole === 'schooladmin' || user.school_id) {
      query += ' WHERE school_id = ? OR (garrison_id = ? AND school_id IS NULL)';
      params = [user.school_id, user.garrison_id];
    } else {
      if (user.school_id) {
        query += ' WHERE school_id = ?';
        params = [user.school_id];
      }
    }

    const [classes] = await db.query(query, params);
    return response.success(res, classes);
  } catch (error) {
    next(error);
  }
};

// ✅ Get class by ID
exports.getClassById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [classes] = await db.query('SELECT * FROM classes WHERE id = ?', [id]);
    if (classes.length === 0) {
      return response.error(res, 'Class not found', 404);
    }
    return response.success(res, classes[0]);
  } catch (error) {
    next(error);
  }
};

// ✅ Create new class
exports.createClass = async (req, res, next) => {
  const { name, school_id } = req.body;
  if (!name) {
    return response.error(res, "Class name is required", 400);
  }

  try {
    const user = req.user;
    let final_school_id = school_id;
    let garrison_id = user.garrison_id;

    if (user.role === 'garrison_director' || user.role === 'admin') {
      final_school_id = school_id || null;
    } else if (user.role === 'school_admin') {
      final_school_id = user.school_id;
    }

    // Ensure garrison_id is set
    garrison_id = user.garrison_id;

    const [result] = await db.query(
      'INSERT INTO classes (id, school_id, garrison_id, name) VALUES (?, ?, ?, ?)',
      [require('crypto').randomUUID(), final_school_id, garrison_id, name]
    );
    return response.success(res, { id: result.insertId }, 'Class created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ✅ Update class
exports.updateClass = async (req, res, next) => {
  const { id } = req.params;
  const { school_id, name } = req.body;
  if (!school_id || !name) {
    return response.error(res, "Please provide all required fields: school_id, name", 400);
  }
  try {
    const [result] = await db.query(
      'UPDATE classes SET school_id = ?, name = ? WHERE id = ?',
      [school_id, name, id]
    );
    if (result.affectedRows === 0) {
      return response.error(res, 'Class not found', 404);
    }
    return response.success(res, null, 'Class updated successfully');
  } catch (error) {
    next(error);
  }
};

// ✅ Delete class
exports.deleteClass = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM classes WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return response.error(res, 'Class not found', 404);
    }
    return response.success(res, null, 'Class deleted successfully');
  } catch (error) {
    next(error);
  }
};
