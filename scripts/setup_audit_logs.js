const db = require('../config/db');

/**
 * Migration script to create the audit_logs table
 */
const setupAuditLogs = async () => {
  try {
    console.log('--- Starting Audit Logs Setup ---');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        action ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'OTHER') NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(36),
        details JSON,
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (resource_id),
        INDEX (school_id),
        INDEX (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;

    await db.query(createTableQuery);
    console.log('✅ audit_logs table created or already exists.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up audit logs table:', error);
    process.exit(1);
  }
};

setupAuditLogs();
