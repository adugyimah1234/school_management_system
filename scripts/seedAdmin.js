const bcrypt = require('bcrypt');
const db = require('../config/db');

const seedAdmin = async () => {
  const fullName = 'System Admin';
  const email = 'admin@school.com';
  const plainPassword = 'password';
  const role = 'admin';
  const schoolId = 1;

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const sql = `
      INSERT INTO users (full_name, email, password, role, school_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [fullName, email, hashedPassword, role, schoolId], (err, result) => {
      if (err) throw err;
      console.log('✅ Admin user inserted:', result.insertId);
      process.exit();
    });
  } catch (error) {
    console.error('❌ Error inserting admin:', error);
    process.exit(1);
  }
};

seedAdmin();
