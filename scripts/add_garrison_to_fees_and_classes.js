const db = require('../config/db');

async function migrate() {
  try {
    console.log('🔄 Starting migration for fees and classes tables...');

    // 1. Ensure fees table exists (it seems to be missing in some environments but used in code)
    console.log('Checking for fees table...');
    const [tables] = await db.query("SHOW TABLES LIKE 'fees'");
    if (tables.length === 0) {
      console.log('Creating fees table...');
      await db.query(`
        CREATE TABLE fees (
          id VARCHAR(36) PRIMARY KEY,
          category_id VARCHAR(36) NOT NULL,
          class_id VARCHAR(36) NOT NULL,
          school_id VARCHAR(36) DEFAULT NULL,
          garrison_id VARCHAR(36) DEFAULT NULL,
          academic_year_id VARCHAR(36) DEFAULT NULL,
          fee_type ENUM('registration', 'admission', 'tuition', 'exam', 'other') NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          description TEXT,
          effective_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (class_id) REFERENCES classes(id),
          FOREIGN KEY (school_id) REFERENCES schools(id),
          FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE SET NULL,
          FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('✅ Fees table created.');
    } else {
      console.log('✅ Fees table already exists.');
      // Add garrison_id if missing
      const [feeCols] = await db.query('SHOW COLUMNS FROM fees LIKE "garrison_id"');
      if (feeCols.length === 0) {
        await db.query(`
          ALTER TABLE fees
          ADD COLUMN garrison_id VARCHAR(36) DEFAULT NULL,
          MODIFY COLUMN school_id VARCHAR(36) DEFAULT NULL,
          ADD CONSTRAINT fk_fees_garrison FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE SET NULL;
        `);
        console.log('✅ Added garrison_id to fees table.');
      }
    }

    // 2. Update classes table
    console.log('Updating classes table...');
    const [classCols] = await db.query('SHOW COLUMNS FROM classes LIKE "garrison_id"');
    if (classCols.length === 0) {
      await db.query(`
        ALTER TABLE classes
        ADD COLUMN garrison_id VARCHAR(36) DEFAULT NULL,
        MODIFY COLUMN school_id VARCHAR(36) DEFAULT NULL,
        ADD CONSTRAINT fk_classes_garrison FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added garrison_id and modified school_id in classes table.');
    } else {
      console.log('✅ garrison_id already exists in classes table.');
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
