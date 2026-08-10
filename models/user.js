const db = require('../config/db');
const crypto = require('crypto');

class User {
  /**
   * Find a user by their ID
   * @param {string} id - The user ID to find
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find a user by their username
   * @param {string} username
   * @returns {Promise<Object|null>}
   */
  static async findByUsername(username) {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  static async create(userData) {
    try {
      const id = userData.id || crypto.randomUUID();
      const record = { id, ...userData };
      await db.query('INSERT INTO users SET ?', [record]);
      return record;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update a user by their ID
   * @param {string} id
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  static async update(id, userData) {
    try {
      await db.query('UPDATE users SET ? WHERE id = ?', [userData, id]);
      return { id, ...userData };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

module.exports = User;
