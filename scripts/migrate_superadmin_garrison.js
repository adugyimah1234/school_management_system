const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    console.log('🔄 Starting Super Admin & Garrison migration...');

    // 1. Create garrisons table
    await db.query(`
      CREATE TABLE IF NOT EXISTS garrisons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(50) DEFAULT NULL,
        location VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log('✅ Garrisons table created/verified.');

    // 2. Insert default Garrison if empty
    const [existingGarrisons] = await db.query('SELECT * FROM garrisons');
    let defaultGarrisonId;
    if (existingGarrisons.length === 0) {
      const [insertRes] = await db.query(
        'INSERT INTO garrisons (name, code, location) VALUES (?, ?, ?)',
        ['Sunyani Garrison (3 Infantry Battalion)', 'GAR-SUN-01', 'Liberation Barracks, Sunyani']
      );
      defaultGarrisonId = insertRes.insertId;
      console.log(`✅ Default Garrison created with ID: ${defaultGarrisonId}`);
    } else {
      defaultGarrisonId = existingGarrisons[0].id;
    }

    // 3. Add garrison_id column to schools table if missing
    const [schoolCols] = await db.query('SHOW COLUMNS FROM schools LIKE "garrison_id"');
    if (schoolCols.length === 0) {
      await db.query(`
        ALTER TABLE schools 
        ADD COLUMN garrison_id INT DEFAULT NULL,
        ADD CONSTRAINT fk_schools_garrison FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added garrison_id column to schools table.');
    }

    // Assign existing schools to default garrison if garrison_id is null
    await db.query('UPDATE schools SET garrison_id = ? WHERE garrison_id IS NULL', [defaultGarrisonId]);
    console.log('✅ Linked existing schools to default Garrison.');

    // 4. Add garrison_id column to users table if missing
    const [userCols] = await db.query('SHOW COLUMNS FROM users LIKE "garrison_id"');
    if (userCols.length === 0) {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN garrison_id INT DEFAULT NULL,
        ADD CONSTRAINT fk_users_garrison FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE SET NULL;
      `);
      console.log('✅ Added garrison_id column to users table.');
    }

    // 5. Ensure roles exist in roles table
    const rolesToEnsure = [
      { name: 'super_admin', description: 'Super Administrator with global multi-garrison access' },
      { name: 'garrison_director', description: 'Garrison Director managing assigned schools and regional performance' },
    ];

    for (const r of rolesToEnsure) {
      const [rows] = await db.query('SELECT id FROM roles WHERE name = ?', [r.name]);
      if (rows.length === 0) {
        await db.query('INSERT INTO roles (name, description) VALUES (?, ?)', [r.name, r.description]);
        console.log(`✅ Added role '${r.name}' to roles table.`);
      }
    }

    // 6. Ensure default Super Admin account exists
    const [superAdminRoles] = await db.query('SELECT id FROM roles WHERE name = ?', ['super_admin']);
    const superAdminRoleId = superAdminRoles[0]?.id;

    if (superAdminRoleId) {
      const [superAdminUsers] = await db.query('SELECT id FROM users WHERE role_id = ? OR username = ?', [superAdminRoleId, 'superadmin']);
      if (superAdminUsers.length === 0) {
        const hashedPassword = await bcrypt.hash('superadmin123', 10);
        await db.query(`
          INSERT INTO users (full_name, email, username, password, role_id, school_id, garrison_id)
          VALUES (?, ?, ?, ?, ?, NULL, NULL)
        `, ['Super Administrator', 'superadmin@garrison.edu', 'superadmin', hashedPassword, superAdminRoleId]);
        console.log('✅ Default Super Admin account created: username "superadmin" / password "superadmin123".');
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
