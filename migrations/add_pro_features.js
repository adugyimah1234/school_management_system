const db = require('../config/db');

async function migrate() {
  console.log('Starting migration: Professional Features (Leadership & Downloads)');

  try {
    // 1. Add Leadership columns to schools and garrisons
    const tables = ['schools', 'garrisons'];
    const proColumns = [
      { name: 'leader_name', definition: 'VARCHAR(255)' },
      { name: 'leader_title', definition: 'VARCHAR(255)' },
      { name: 'leader_message', definition: 'TEXT' },
      { name: 'leader_image_url', definition: 'TEXT' }
    ];

    for (const table of tables) {
      for (const col of proColumns) {
        const [existing] = await db.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [table, col.name]
        );
        if (existing.length === 0) {
          await db.query(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.definition}`);
          console.log(`Success: Added ${col.name} to ${table}`);
        }
      }
    }

    // 2. Create school_documents table
    await db.query(`
      CREATE TABLE IF NOT EXISTS school_documents (
        id VARCHAR(255) PRIMARY KEY,
        owner_id VARCHAR(255) NOT NULL,
        owner_type ENUM('school', 'garrison') NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50) DEFAULT 'PDF',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Success: Created school_documents table');

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
