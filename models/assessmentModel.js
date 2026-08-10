const db = require('../config/db');

const Assessment = {
  async getAll(filter = {}) {
    let query = 'SELECT * FROM assessments';
    const params = [];
    const whereConditions = [];

    if (filter.garrison_id) {
      if (filter.school_id) {
        // If a specific school is requested, show assessments for that school OR garrison-wide ones
        whereConditions.push('garrison_id = ? AND (school_id = ? OR school_id IS NULL)');
        params.push(filter.garrison_id, filter.school_id);
      } else {
        // If just garrison is provided (Garrison Director), show everything in garrison
        whereConditions.push('garrison_id = ?');
        params.push(filter.garrison_id);
      }
    } else if (filter.school_id) {
      whereConditions.push('school_id = ?');
      params.push(filter.school_id);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const [rows] = await db.query(query, params);
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM assessments WHERE id = ?', [id]);
    return rows;
  },

  async create(assessmentData, user = null) {
    const crypto = require('crypto');
    const id = crypto.randomUUID();
    const data = {
      id,
      ...assessmentData,
      garrison_id: assessmentData.garrison_id || (user ? user.garrison_id : null),
      school_id: assessmentData.school_id || (user ? user.school_id : null)
    };
    const [result] = await db.query('INSERT INTO assessments SET ?', [data]);
    return { ...result, insertId: id };
  },

  async update(id, assessmentData) {
    await db.query('UPDATE assessments SET ? WHERE id = ?', [assessmentData, id]);
  },

  async delete(id) {
    await db.query('DELETE FROM assessments WHERE id = ?', [id]);
  }
};

module.exports = Assessment;
