const db = require("../config/db");
const bcrypt = require('bcryptjs');
const cache = require("../utils/cacheManager");
const logger = require("../utils/logger");

class UserService {
  async getUserById(id) {
    try {
      const cacheKey = `user:${id}`;
      try {
        const cached = await cache.get(cacheKey);
        if (cached) return cached;
      } catch (cacheErr) {
        logger.error('Redis error in UserService:', cacheErr.message);
      }

      const [results] = await db.query(`
        SELECT u.id, u.full_name, u.username, u.email, u.role_id, u.school_id, u.garrison_id, r.name as role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `, [id]);

      const user = results[0] || null;

      if (user) {
        try {
          await cache.set(cacheKey, user, 1800); // 30 mins
        } catch (cacheErr) { }
      }
      return user;
    } catch (err) {
      logger.error('Error in getUserById: ' + err.message);
      throw err;
    }
  }

  async registerUser(userData) {
    const { full_name, email, username, password, role_id, school_id, garrison_id } = userData;
    const hashed = await bcrypt.hash(password, 10);
    const id = require('crypto').randomUUID();

    const sql = `
      INSERT INTO users (id, full_name, email, username, password, role_id, school_id, garrison_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [id, full_name, email, username, hashed, role_id, school_id, garrison_id]);
    return { id, ...userData };
  }

  async updateUser(id, updateData) {
    // ... logic for updates ...
    try {
      await cache.del(`user:${id}`);
    } catch (cacheErr) { }
  }
}

module.exports = new UserService();
