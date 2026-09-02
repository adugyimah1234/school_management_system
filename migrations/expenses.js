const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Expenses Tracker Migration...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        category ENUM('utilities', 'maintenance', 'supplies', 'salaries', 'rent', 'other') DEFAULT 'other',
        amount DECIMAL(15, 2) NOT NULL,
        description TEXT,
        expense_date DATE NOT NULL,
        recorded_by VARCHAR(36),
        receipt_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Expenses table created.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
