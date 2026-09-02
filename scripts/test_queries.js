const db = require('../config/db');
async function test() {
  try {
    const [r1] = await db.query('SELECT COUNT(*) AS total FROM garrisons');
    console.log('garrisons:', JSON.stringify(r1));
    
    const [r2] = await db.query('SELECT COUNT(*) AS total FROM schools');
    console.log('schools:', JSON.stringify(r2));

    const [r3] = await db.query('SELECT COUNT(*) AS total FROM students');
    console.log('students:', JSON.stringify(r3));

    // Test garrison join
    const [r4] = await db.query(
      'SELECT g.id, g.name, COUNT(DISTINCT s.id) AS total_schools, COUNT(DISTINCT st.id) AS total_students ' +
      'FROM garrisons g ' +
      'LEFT JOIN schools s ON s.garrison_id = g.id ' +
      'LEFT JOIN students st ON st.school_id = s.id ' +
      'GROUP BY g.id, g.name'
    );
    console.log('garrison join:', JSON.stringify(r4));

    // Test school performance using payments table (has school_id)
    const [r5] = await db.query(
      'SELECT s.id AS school_id, s.name AS school_name, ' +
      'COUNT(DISTINCT st.id) AS total_students, ' +
      'COUNT(DISTINCT u.id) AS total_staff, ' +
      'COALESCE(SUM(p.amount_paid), 0) AS fee_collected ' +
      'FROM schools s ' +
      'LEFT JOIN students st ON st.school_id = s.id ' +
      'LEFT JOIN users u ON u.school_id = s.id ' +
      'LEFT JOIN payments p ON p.school_id = s.id ' +
      'GROUP BY s.id, s.name'
    );
    console.log('school perf:', JSON.stringify(r5));

  } catch(e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
test();
