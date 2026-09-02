const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Exeat & Leave Tracking Migration...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS exeats (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36),
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        exeat_type ENUM('day', 'weekend', 'medical', 'emergency') DEFAULT 'day',
        departure_date DATETIME NOT NULL,
        expected_return_date DATETIME NOT NULL,
        actual_return_date DATETIME,
        reason TEXT,
        status ENUM('pending', 'approved', 'departed', 'returned', 'overdue') DEFAULT 'pending',
        approved_by VARCHAR(36),
        recorded_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Exeats table created.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
