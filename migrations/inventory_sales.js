const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Inventory Sales History Migration...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_sales (
        id VARCHAR(36) PRIMARY KEY,
        item_id VARCHAR(36),
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        student_id VARCHAR(36),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('cash', 'momo', 'debt') DEFAULT 'cash',
        sold_by VARCHAR(36),
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE SET NULL,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
        FOREIGN KEY (sold_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Inventory Sales table created.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
