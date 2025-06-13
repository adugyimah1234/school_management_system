const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_management',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional: test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    const [rows] = await connection.query('SELECT DATABASE() AS db;');
    console.log('📦 Using database:', rows[0].db);
    connection.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err);
  }
})();

module.exports = pool;
