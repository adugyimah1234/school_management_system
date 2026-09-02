const db = require('../config/db');

async function migrate() {
  console.log('Starting migration: Add website settings to schools table');

  try {
    const columns = [
      { name: 'custom_domain', definition: 'VARCHAR(255) UNIQUE' },
      { name: 'website_logo_url', definition: 'TEXT' },
      { name: 'primary_color', definition: 'VARCHAR(20) DEFAULT "#0f172a"' },
      { name: 'secondary_color', definition: 'VARCHAR(20) DEFAULT "#3b82f6"' },
      { name: 'hero_title', definition: 'VARCHAR(255)' },
      { name: 'hero_subtitle', definition: 'TEXT' },
      { name: 'about_text', definition: 'TEXT' },
      { name: 'contact_email', definition: 'VARCHAR(255)' },
      { name: 'contact_phone', definition: 'VARCHAR(20)' },
      { name: 'facebook_url', definition: 'VARCHAR(255)' },
      { name: 'twitter_url', definition: 'VARCHAR(255)' },
      { name: 'instagram_url', definition: 'VARCHAR(255)' },
      { name: 'is_website_enabled', definition: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const col of columns) {
      try {
        // Check if column exists
        const [existing] = await db.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = ?`,
          [col.name]
        );

        if (existing.length === 0) {
          await db.query(`ALTER TABLE schools ADD COLUMN ${col.name} ${col.definition}`);
          console.log(`Success: Added column ${col.name}`);
        } else {
          console.log(`Info: Column ${col.name} already exists`);
        }
      } catch (err) {
        console.error(`Error adding column ${col.name}:`, err.message);
      }
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
