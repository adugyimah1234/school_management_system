const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Payroll Management Migration...");

    // 1. Payroll Settings Table (Base salaries per role or user)
    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll_settings (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) UNIQUE,
        role_id VARCHAR(36),
        base_salary DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        allowances DECIMAL(15, 2) DEFAULT 0.00,
        deductions DECIMAL(15, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Payroll Settings table created.");

    // 2. Payroll History Table (Actual monthly payments)
    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll_history (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        month INT NOT NULL,
        year INT NOT NULL,
        base_salary DECIMAL(15, 2) NOT NULL,
        allowances DECIMAL(15, 2) DEFAULT 0.00,
        deductions DECIMAL(15, 2) DEFAULT 0.00,
        net_salary DECIMAL(15, 2) NOT NULL,
        payment_status ENUM('draft', 'approved', 'paid') DEFAULT 'draft',
        payment_date DATE,
        recorded_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY user_period (user_id, month, year),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Payroll History table created.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
