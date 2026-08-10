const db = require('../config/db');

/**
 * Database Optimization Script
 * Adds strategic indexes to speed up common queries
 */
const optimizeDB = async () => {
  try {
    console.log('--- Starting Database Optimization ---');

    const addIndexSafe = async (table, indexName, columns) => {
      try {
        // Check if index exists
        const [rows] = await db.query(`
          SELECT COUNT(1) as hasIndex
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?
        `, [table, indexName]);

        if (rows[0].hasIndex === 0) {
          console.log(`Adding index ${indexName} to ${table}...`);
          await db.query(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columns})`);
        } else {
          console.log(`Index ${indexName} already exists on ${table}.`);
        }
      } catch (err) {
        console.error(`Error processing index ${indexName} on ${table}:`, err.message);
      }
    };

    // 1. Indexing Registrations
    await addIndexSafe('registrations', 'idx_reg_school', 'school_id');
    await addIndexSafe('registrations', 'idx_reg_garrison', 'garrison_id');
    await addIndexSafe('registrations', 'idx_reg_status', 'status');
    await addIndexSafe('registrations', 'idx_reg_created', 'created_at');

    // 2. Indexing Users
    await addIndexSafe('users', 'idx_user_username', 'username');
    await addIndexSafe('users', 'idx_user_school', 'school_id');

    // 3. Indexing Students
    await addIndexSafe('students', 'idx_student_school', 'school_id');
    await addIndexSafe('students', 'idx_student_class', 'class_id');

    console.log('✅ Database optimization complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
};

optimizeDB();
