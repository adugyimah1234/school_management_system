const db = require('../config/db.promise');

const SettingModel = {
  getAll: async (filter = {}) => {
    let query = 'SELECT * FROM settings';
    const params = [];
    const whereConditions = [];

    if (filter.garrison_id) {
      whereConditions.push('(garrison_id = ? OR garrison_id IS NULL)');
      params.push(filter.garrison_id);
    }
    if (filter.school_id) {
      whereConditions.push('(school_id = ? OR school_id IS NULL)');
      params.push(filter.school_id);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ' ORDER BY setting_group, setting_key';
    const [rows] = await db.query(query, params);
    return rows;
  },

  getByGroup: async (groupName, filter = {}) => {
    let query = 'SELECT * FROM settings WHERE setting_group = ?';
    const params = [groupName];

    if (filter.garrison_id) {
      query += ' AND (garrison_id = ? OR garrison_id IS NULL)';
      params.push(filter.garrison_id);
    }
    if (filter.school_id) {
      query += ' AND (school_id = ? OR school_id IS NULL)';
      params.push(filter.school_id);
    }

    query += ' ORDER BY setting_key';
    const [rows] = await db.query(query, params);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM settings WHERE id = ?', [id]);
    return rows[0];
  },

  create: async (settingData) => {
    const { setting_group, setting_key, setting_value, garrison_id, school_id } = settingData;
    const [result] = await db.query(
      'INSERT INTO settings (setting_group, setting_key, setting_value, garrison_id, school_id) VALUES (?, ?, ?, ?, ?)',
      [setting_group, setting_key, JSON.stringify(setting_value), garrison_id || null, school_id || null]
    );
    return result.insertId;
  },

  update: async (id, settingData, filter = {}) => {
    const { setting_group, setting_key, setting_value, garrison_id, school_id } = settingData;
    let query = 'UPDATE settings SET setting_group = ?, setting_key = ?, setting_value = ?, garrison_id = ?, school_id = ? WHERE id = ?';
    const params = [setting_group, setting_key, JSON.stringify(setting_value), garrison_id || null, school_id || null, id];

    if (filter.garrison_id) {
      query += ' AND (garrison_id = ? OR garrison_id IS NULL)';
      params.push(filter.garrison_id);
    }

    const [result] = await db.query(query, params);
    return result.affectedRows;
  },

  delete: async (id, filter = {}) => {
    let query = 'DELETE FROM settings WHERE id = ?';
    const params = [id];

    if (filter.garrison_id) {
      query += ' AND (garrison_id = ? OR garrison_id IS NULL)';
      params.push(filter.garrison_id);
    }

    const [result] = await db.query(query, params);
    return result.affectedRows;
  }
};

module.exports = SettingModel;
