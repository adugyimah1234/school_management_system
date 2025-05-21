const db = require('../config/db');

/**
 * Module model for interacting with the module_access table in the database
 */
class ModuleAccess {
  /**
   * Get a user's module access
   * @param {number} userId - The user ID to get access for
   * @returns {Promise<Object>} Map of module IDs to boolean access rights
   */
  static async getUserModuleAccess(userId) {
    try {
      const [rows] = await db.promise().query(
        'SELECT module_id, has_access FROM user_module_access WHERE user_id = ?',
        [userId]
      );
      
      // Convert the rows to a map of module IDs to boolean access rights
      const moduleAccessMap = {};
      
      for (const row of rows) {
        moduleAccessMap[row.module_id] = !!row.has_access;
      }
      
      return moduleAccessMap;
    } catch (error) {
      console.error('Error getting user module access:', error);
      throw error;
    }
  }

  /**
   * Update a user's access to a specific module
   * @param {number} userId - The user ID to update access for
   * @param {string} moduleId - The module ID to update access for
   * @param {boolean} hasAccess - Whether the user should have access to the module
   * @returns {Promise<Object>} The result of the operation
   */
  static async updateModuleAccess(userId, moduleId, hasAccess) {
    try {
      // Check if an access record already exists
      const [existingRows] = await db.promise().query(
        'SELECT * FROM user_module_access WHERE user_id = ? AND module_id = ?',
        [userId, moduleId]
      );
      
      if (existingRows.length > 0) {
        // Update existing record
        await db.promise().query(
          'UPDATE user_module_access SET has_access = ? WHERE user_id = ? AND module_id = ?',
          [hasAccess, userId, moduleId]
        );
      } else {
        // Insert new record
        await db.promise().query(
          'INSERT INTO user_module_access (user_id, module_id, has_access) VALUES (?, ?, ?)',
          [userId, moduleId, hasAccess]
        );
      }
      
      return { userId, moduleId, hasAccess };
    } catch (error) {
      console.error('Error updating module access:', error);
      throw error;
    }
  }

  /**
   * Get all modules a user has access to
   * @param {number} userId - The user ID to get modules for
   * @returns {Promise<string[]>} Array of module IDs the user has access to
   */
  static async getUserAccessibleModules(userId) {
    try {
      const [rows] = await db.promise().query(
        'SELECT module_id FROM user_module_access WHERE user_id = ? AND has_access = TRUE',
        [userId]
      );
      
      return rows.map(row => row.module_id);
    } catch (error) {
      console.error('Error getting user accessible modules:', error);
      throw error;
    }
  }
}

module.exports = ModuleAccess;
