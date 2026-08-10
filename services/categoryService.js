const db = require("../config/db");
const cache = require("../utils/cacheManager");
const crypto = require("crypto");
const logger = require("../utils/logger");

class CategoryService {
  async getAllCategories(user = null) {
    try {
      let query = 'SELECT * FROM categories';
      let params = [];

      if (user) {
        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole !== 'superadmin') {
          if (normalizedRole === 'garrisondirector' || (normalizedRole === 'admin' && !user.school_id)) {
            query += ' WHERE garrison_id = ?';
            params = [user.garrison_id];
          } else if (normalizedRole === 'schooladmin' || normalizedRole === 'admin' || user.school_id) {
            query += ' WHERE school_id = ? OR (garrison_id = ? AND school_id IS NULL)';
            params = [user.school_id, user.garrison_id];
          }
        }
      }

      const cacheKey = `categories:user_role_${user ? user.role : 'all'}:school_${user?.school_id || 'none'}:garrison_${user?.garrison_id || 'none'}`;
      try {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) return cachedData;
      } catch (e) {
        logger.error('Redis error in getAllCategories: ' + e.message);
      }

      const [categories] = await db.query(query, params);

      try {
        await cache.set(cacheKey, categories, 3600);
      } catch (e) { }

      return categories;
    } catch (err) {
      logger.error('Error in getAllCategories service: ' + err.message);
      throw err;
    }
  }

  async getCategoryById(id) {
    try {
      const cacheKey = `category:${id}`;
      try {
        const cached = await cache.get(cacheKey);
        if (cached) return cached;
      } catch (e) { }

      const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
      const category = categories[0] || null;

      if (category) {
        try {
          await cache.set(cacheKey, category, 3600);
        } catch (e) { }
      }
      return category;
    } catch (err) {
      logger.error('Error in getCategoryById service: ' + err.message);
      throw err;
    }
  }

  async createCategory(data) {
    try {
      const id = crypto.randomUUID();
      const { name, code, description, amount, status, school_id, garrison_id } = data;

      await db.query(
        'INSERT INTO categories (id, name, code, description, amount, status, school_id, garrison_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, code, description, amount || 0, status || 'active', school_id || null, garrison_id || null]
      );

      try {
        await cache.del('categories:all');
      } catch (e) { }

      return { id, ...data };
    } catch (err) {
      logger.error('Error in createCategory service: ' + err.message);
      throw err;
    }
  }

  async updateCategory(id, data) {
    try {
      const fields = [];
      const values = [];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      });

      if (fields.length === 0) return true;

      values.push(id);
      const [result] = await db.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);

      if (result.affectedRows > 0) {
        try {
          await cache.del('categories:all');
          await cache.del(`category:${id}`);
        } catch (e) { }
      }
      return result.affectedRows > 0;
    } catch (err) {
      logger.error('Error in updateCategory service: ' + err.message);
      throw err;
    }
  }

  async deleteCategory(id) {
    try {
      const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
      if (result.affectedRows > 0) {
        try {
          await cache.del('categories:all');
          await cache.del(`category:${id}`);
        } catch (e) { }
      }
      return result.affectedRows > 0;
    } catch (err) {
      logger.error('Error in deleteCategory service: ' + err.message);
      throw err;
    }
  }
}

module.exports = new CategoryService();
