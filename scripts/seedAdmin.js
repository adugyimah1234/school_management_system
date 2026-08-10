const bcrypt = require('bcryptjs');
const db = require('../config/db');
const crypto = require('crypto');

const seedAdmin = async () => {
  const fullName = 'System Admin';
  const username = 'admin';
  const plainPassword = 'password123';
  const roleName = 'admin';

  try {
    // 1. Get role_id for admin
    const [roles] = await db.query('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (roles.length === 0) {
      console.error('❌ Role "admin" not found. Please run migrations first.');
      process.exit(1);
    }
    const roleId = roles[0].id;

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const id = crypto.randomUUID();

    // 3. Insert admin user (assuming modern schema with UUID and role_id)
    const sql = `
      INSERT INTO users (id, full_name, username, password, role_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    await db.query(sql, [id, fullName, username, hashedPassword, roleId]);

    console.log('✅ Admin user inserted successfully.');
    console.log('Username: admin');
    console.log('Password: password123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error inserting admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
