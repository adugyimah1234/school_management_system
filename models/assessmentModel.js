const db = require('../config/db');

const Assessment = {
  async getAll(filter = {}) {
    let query = 'SELECT * FROM assessments';
    const params = [];
    const whereConditions = [];

    // Basic isolation logic
    if (filter.garrison_id) {
      if (filter.school_id) {
        // Hierarchical fetch for schools:
        // 1. Specifically for this school
        // 2. Garrison-wide (school_id is NULL)
        whereConditions.push('garrison_id = ? AND (school_id = ? OR school_id IS NULL)');
        params.push(filter.garrison_id, filter.school_id);
      } else {
        // Garrison level (Garrison Director): see all school-specific and garrison-wide within this garrison
        whereConditions.push('garrison_id = ?');
        params.push(filter.garrison_id);
      }
    } else if (filter.school_id) {
      // Fallback for when garrison_id is somehow missing but school_id exists
      whereConditions.push('school_id = ?');
      params.push(filter.school_id);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Order by name and then by scope (Garrison-wide vs School-specific)
    // NULL school_id (Garrison-wide) comes first if we use ASC, but we want to handle overrides.
    query += ' ORDER BY name ASC, school_id ASC';

    const [rows] = await db.query(query, params);

    // Override Logic: If a Garrison-wide assessment (school_id IS NULL)
    // exists with the same name as a school-specific assessment,
    // the Garrison one should "override" (hide or take precedence).
    // This is mostly relevant when filtering for a specific school.
    if (filter.school_id) {
      const garrisonWide = rows.filter(a => a.school_id === null);
      const schoolSpecific = rows.filter(a => a.school_id !== null);

      const filtered = [];
      const garrisonNames = new Set(garrisonWide.map(a => a.name.toLowerCase()));

      // Keep all garrison wide ones
      filtered.push(...garrisonWide);

      // Keep school specific ones ONLY if there is no garrison wide one with the same name
      schoolSpecific.forEach(sa => {
        if (!garrisonNames.has(sa.name.toLowerCase())) {
          filtered.push(sa);
        }
      });

      return filtered;
    }

    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM assessments WHERE id = ?', [id]);
    return rows;
  },

  async create(assessmentData, user = null) {
    const crypto = require('crypto');
    const id = crypto.randomUUID();

    // Explicitly handle hierarchy
    // If school_id is provided as null (string "null" or actual null) or missing,
    // we determine scope based on user role.

    const data = {
      id,
      name: assessmentData.name,
      date: assessmentData.date,
      venue: assessmentData.venue,
      category_id: assessmentData.category_id || null,
      class_level: assessmentData.class_level || 'All Classes',
      // If user provided a specific school_id, use it. Otherwise, if they are a school admin, use their school.
      // If they are a director and school_id is null/missing, it stays null (Garrison-wide).
      school_id: assessmentData.school_id !== undefined ? assessmentData.school_id : (user ? user.school_id : null),
      // Garrison ID is mandatory for scoping.
      garrison_id: assessmentData.garrison_id || (user ? user.garrison_id : null)
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
