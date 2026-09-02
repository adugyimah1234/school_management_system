const db = require('../config/db');

async function list() {
  try {
    const [rows] = await db.query('SHOW TABLES');
    console.log('Tables in database:');
    rows.forEach(row => {
      console.log(Object.values(row)[0]);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

list();
