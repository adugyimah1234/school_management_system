const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

async function migrateSettings() {
  try {
    console.log('Migrating settings table...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_group VARCHAR(100) NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_group_key (setting_group, setting_key)
      );
    `;
    await db.query(createTableQuery);
    console.log('✅ Settings table created successfully');

    // Seed data
    const seedData = [
      // Genders
      { group: 'genders', key: 'Male', value: JSON.stringify({ label: 'Male' }) },
      { group: 'genders', key: 'Female', value: JSON.stringify({ label: 'Female' }) },
      
      // Jersey Sizes
      { group: 'jersey_sizes', key: 'XS', value: JSON.stringify({ label: 'XS', price: 115 }) },
      { group: 'jersey_sizes', key: 'S', value: JSON.stringify({ label: 'S', price: 115 }) },
      { group: 'jersey_sizes', key: 'M', value: JSON.stringify({ label: 'M', price: 115 }) },
      { group: 'jersey_sizes', key: 'L', value: JSON.stringify({ label: 'L', price: 115 }) },
      { group: 'jersey_sizes', key: 'XL', value: JSON.stringify({ label: 'XL', price: 115 }) },
      { group: 'jersey_sizes', key: 'XXL', value: JSON.stringify({ label: 'XXL', price: 115 }) },
      
      // Fee Types
      { group: 'fee_types', key: 'registration', value: JSON.stringify({ label: 'Registration' }) },
      { group: 'fee_types', key: 'levy', value: JSON.stringify({ label: 'Levy' }) },
      { group: 'fee_types', key: 'furniture', value: JSON.stringify({ label: 'Furniture' }) },
      { group: 'fee_types', key: 'textBooks', value: JSON.stringify({ label: 'Text Books' }) },
      { group: 'fee_types', key: 'exerciseBooks', value: JSON.stringify({ label: 'Exercise Books' }) },
      { group: 'fee_types', key: 'jersey', value: JSON.stringify({ label: 'Jersey' }) },
      { group: 'fee_types', key: 'crest', value: JSON.stringify({ label: 'Crest' }) },

      // Roles
      { group: 'roles', key: 'admin', value: JSON.stringify({ label: 'Admin' }) },
      { group: 'roles', key: 'staff', value: JSON.stringify({ label: 'Staff' }) },
      { group: 'roles', key: 'student', value: JSON.stringify({ label: 'Student' }) },

      // Transaction Types
      { group: 'transaction_types', key: 'income', value: JSON.stringify({ label: 'Income' }) },
      { group: 'transaction_types', key: 'expense', value: JSON.stringify({ label: 'Expense' }) },

      // Class Categories
      { group: 'system_categories', key: 'fee', value: JSON.stringify({ label: 'Fee Category' }) },
      { group: 'system_categories', key: 'class', value: JSON.stringify({ label: 'Class Category' }) },
      { group: 'system_categories', key: 'student', value: JSON.stringify({ label: 'Student Category' }) },
      
      // School Levels
      { group: 'school_levels', key: 'primary', value: JSON.stringify({ label: 'Primary School' }) },
      { group: 'school_levels', key: 'secondary', value: JSON.stringify({ label: 'Secondary School' }) },
    ];

    for (const item of seedData) {
      const checkQuery = 'SELECT id FROM settings WHERE setting_group = ? AND setting_key = ?';
      const [rows] = await db.query(checkQuery, [item.group, item.key]);
      
      if (rows.length === 0) {
        const insertQuery = 'INSERT INTO settings (setting_group, setting_key, setting_value) VALUES (?, ?, ?)';
        await db.query(insertQuery, [item.group, item.key, item.value]);
        console.log(`Seeded: ${item.group} - ${item.key}`);
      }
    }

    console.log('✅ Settings seed completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateSettings();
