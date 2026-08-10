const db = require('../config/db');
const crypto = require('crypto');

/**
 * Migration script to create the exams table and update receipts
 */
const migrateExams = async () => {
  try {
    console.log('--- Starting Exams & Receipts Migration ---');

    // 1. Create exams table
    console.log('Creating exams table...');
    const createExamsTable = `
      CREATE TABLE IF NOT EXISTS exams (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        class_id VARCHAR(36) NOT NULL,
        category_id VARCHAR(36),
        name VARCHAR(100),
        date DATE,
        venue VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;
    await db.query(createExamsTable);
    console.log('✅ Exams table created.');

    // 2. Add exam_id to receipts table
    console.log('Checking receipts table for exam_id column...');
    const [columns] = await db.query("SHOW COLUMNS FROM receipts LIKE 'exam_id'");
    if (columns.length === 0) {
      console.log('Adding exam_id column to receipts table...');
      await db.query(`
        ALTER TABLE receipts
        ADD COLUMN exam_id VARCHAR(36) DEFAULT NULL,
        ADD CONSTRAINT fk_receipts_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added exam_id column to receipts table.');
    } else {
      console.log('✅ exam_id column already exists in receipts table.');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
};

migrateExams();
