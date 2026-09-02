const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Teacher Performance & Attendance Migration...");

    // 1. Teacher Attendance Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS teacher_attendance (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        school_id VARCHAR(36),
        check_in DATETIME NOT NULL,
        check_out DATETIME,
        status ENUM('present', 'late', 'absent', 'on_leave') DEFAULT 'present',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Teacher Attendance table created.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
