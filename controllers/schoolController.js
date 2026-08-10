const db = require('../config/db');
const response = require('../utils/apiResponse');

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
  try {
    const [result] = await db.query(
      'UPDATE schools SET name = ?, address = ?, phone_number = ?, email = ? WHERE id = ?',
      [name, address, phone_number, email, id]
    );
    if (result.affectedRows === 0) {
      return response.error(res, 'School not found', 404);
    }
    return response.success(res, null, 'School updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteSchool = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM schools WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return response.error(res, 'School not found', 404);
    }
    return response.success(res, null, 'School deleted successfully');
  } catch (error) {
    next(error);
  }
};
