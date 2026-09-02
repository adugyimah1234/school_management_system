const db = require('../config/db');
const crypto = require('crypto');

/**
 * Records an action in the audit log
 * @param {Object} data
 * @param {string} data.user_id - ID of the user performing the action
 * @param {string} data.action - e.g., 'UPDATE_SCHOOL_WEBSITE', 'DELETE_UNIT'
 * @param {string} data.target_type - e.g., 'school', 'garrison', 'user'
 * @param {string} data.target_id - ID of the entity being acted upon
 * @param {Object} data.changes - Optional JSON object of before/after changes
 * @param {string} data.ip_address - IP address of the requester
 */
exports.logAction = async ({ user_id, action, target_type, target_id, changes, ip_address }) => {
    try {
        const id = crypto.randomUUID();
        await db.query(
            'INSERT INTO audit_logs (id, user_id, action, target_type, target_id, changes, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, user_id, action, target_type, target_id, JSON.stringify(changes || {}), ip_address]
        );
    } catch (err) {
        console.error('Audit Log Error:', err.message);
        // We don't throw here to avoid crashing the main request if logging fails
    }
};
