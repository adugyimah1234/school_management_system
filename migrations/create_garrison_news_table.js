const db = require('../config/db');

async function migrate() {
  console.log('Starting migration: Create garrison_news table');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS garrison_news (
        id VARCHAR(255) PRIMARY KEY,
        garrison_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE
      )
    `);
    console.log('Success: Created garrison_news table');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
