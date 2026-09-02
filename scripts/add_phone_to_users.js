const db = require('../config/db');

async function migrate() {
  try {
    console.log('🚀 Adding phone_number to users table...');
    await db.query('ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) AFTER email');
    console.log('✅ phone_number added successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
