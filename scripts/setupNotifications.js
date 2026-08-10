const db = require('../config/db');

async function setup() {
  try {
    console.log('Creating notifications table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        school_id VARCHAR(36) NULL,
        garrison_id VARCHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_read (is_read),
        INDEX idx_created (created_at)
      )
    `);
    console.log('✅ Notifications table created.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create notifications table:', err);
    process.exit(1);
  }
}

setup();
