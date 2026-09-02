const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Remarks Bank Migration...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS remarks_bank (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        category ENUM('academic', 'conduct', 'general', 'interest') DEFAULT 'general',
        remark_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Remarks Bank table created.");

    // Insert some default Garrison-style professional remarks
    const defaults = [
        ['academic', 'An exceptionally brilliant and hardworking student. Maintain the standard.'],
        ['academic', 'Performance is satisfactory but more effort is needed in Mathematics.'],
        ['conduct', 'A disciplined student with high moral standards. A role model to peers.'],
        ['conduct', 'Needs to improve on punctuality and general class conduct.'],
        ['general', 'A promising student. Promoted to next class.'],
        ['general', 'Hard work pays. Keep the fire burning.'],
        ['interest', 'Shows great interest in sporting activities and physical education.'],
        ['interest', 'An active member of the school choir and cultural troupe.']
    ];

    for (const [cat, text] of defaults) {
        await db.query("INSERT INTO remarks_bank (id, category, remark_text) VALUES (UUID(), ?, ?)", [cat, text]);
    }
    console.log("✅ Seeded default professional remarks.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
