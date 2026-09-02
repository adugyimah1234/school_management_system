const db = require('../config/db');
const crypto = require('crypto');

async function seed() {
  try {
    console.log('Seeding initial notifications...');

    // 1. Global notification
    await db.query(
      'INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, NULL, ?, ?, ?)',
      [crypto.randomUUID(), 'System Standard Update', 'All institutional standards have been synchronized across the network.', 'info']
    );

    // 2. Specific for a school (if exists)
    const [[school]] = await db.query('SELECT id FROM schools LIMIT 1');
    if (school) {
        await db.query(
            'INSERT INTO notifications (id, title, message, type, school_id) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), 'New Admission Alert', 'A new student has been admitted to your unit.', 'success', school.id]
        );
    }

    console.log('✅ Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
