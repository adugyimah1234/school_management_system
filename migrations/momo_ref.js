const db = require("../config/db");

async function migrate() {
  try {
    console.log("Adding Transaction Reference to Payments...");

    const [cols] = await db.query("SHOW COLUMNS FROM payments LIKE 'transaction_reference'");
    if (cols.length === 0) {
        await db.query(`
          ALTER TABLE payments
          ADD COLUMN transaction_reference VARCHAR(100) UNIQUE AFTER method
        `);
        console.log("✅ Column added.");
    } else {
        console.log("ℹ️ Column already exists.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
