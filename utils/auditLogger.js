const db = require('../config/db');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Audit Logger Utility
 * Records user actions for security and tracking
 */
const logAction = async ({ userId, action, resourceType, resourceId, details, schoolId, garrisonId }) => {
  try {
    const id = crypto.randomUUID();

    // Convert details object to string if it exists
    const detailString = details ? JSON.stringify(details) : null;

    const sql = `
      INSERT INTO audit_logs
      (id, user_id, action, resource_type, resource_id, details, school_id, garrison_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      id,
      userId,
      action,
      resourceType,
      resourceId,
      detailString,
      schoolId || null,
      garrisonId || null
    ]);
  } catch (error) {
    // We don't want to crash the main request if logging fails,
    // but we should definitely see it in the console.
    logger.error('CRITICAL: Audit log failed to write: ' + error.message);
  }
};

module.exports = { logAction };
