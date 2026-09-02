const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Duty Roster Migration...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS duty_roster (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        user_id VARCHAR(36),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        duty_type VARCHAR(100) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Duty Roster table created.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
