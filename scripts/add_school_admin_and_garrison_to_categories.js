const db = require('../config/db');

async function migrate() {
  try {
    console.log('🔄 Starting migration for school_admin role and garrison_id/school_id in categories...');

    // 1. Add garrison_id column to categories table if missing
    const [garrisonCols] = await db.query('SHOW COLUMNS FROM categories LIKE "garrison_id"');
    if (garrisonCols.length === 0) {
      await db.query(`
        ALTER TABLE categories
        ADD COLUMN garrison_id VARCHAR(36) DEFAULT NULL,
        ADD CONSTRAINT fk_categories_garrison FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added garrison_id column to categories table.');
    } else {
      console.log('✅ garrison_id column already exists in categories table.');
    }

    // 2. Add school_id column to categories table if missing
    const [schoolCols] = await db.query('SHOW COLUMNS FROM categories LIKE "school_id"');
    if (schoolCols.length === 0) {
      await db.query(`
        ALTER TABLE categories
        ADD COLUMN school_id VARCHAR(36) DEFAULT NULL,
        ADD CONSTRAINT fk_categories_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added school_id column to categories table.');
    } else {
      console.log('✅ school_id column already exists in categories table.');
    }

    // 3. Ensure school_admin role exists
    const rolesToEnsure = [
      { name: 'school_admin', description: 'School Administrator managing a single assigned school' },
    ];

    for (const r of rolesToEnsure) {
      const [rows] = await db.query('SELECT id FROM roles WHERE name = ?', [r.name]);
      if (rows.length === 0) {
        await db.query('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', [require('crypto').randomUUID(), r.name, r.description]);
        console.log(`✅ Added role '${r.name}' to roles table.`);
      } else {
        console.log(`✅ Role '${r.name}' already exists.`);
      }
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
