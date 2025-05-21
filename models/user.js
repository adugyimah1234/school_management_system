const db = require('../config/db');

/**
 * User model for interacting with the users table in the database
 */
class User {
  /**
   * Find a user by their ID
   * @param {number} id - The user ID to find
   * @returns {Promise<Object|null>} The user object or null if not found
   */
  static async findById(id) {
    try {
      const [rows] = await db.promise().query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find a user by their email
   * @param {string} email - The user email to find
   * @returns {Promise<Object|null>} The user object or null if not found
   */
  static async findByEmail(email) {
    try {
      const [rows] = await db.promise().query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - The user data to insert
   * @returns {Promise<Object>} The result of the insert operation
   */
  static async create(userData) {
    try {
      const [result] = await db.promise().query(
        'INSERT INTO users SET ?',
        [userData]
      );
      
      return { id: result.insertId, ...userData };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update a user by their ID
   * @param {number} id - The user ID to update
   * @param {Object} userData - The user data to update
   * @returns {Promise<Object>} The result of the update operation
   */
  static async update(id, userData) {
    try {
      await db.promise().query(
        'UPDATE users SET ? WHERE id = ?',
        [userData, id]
      );
      
      return { id, ...userData };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

module.exports = User;

