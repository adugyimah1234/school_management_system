const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Academic Term Summaries Migration...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS term_summaries (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36),
        term_id VARCHAR(36),
        aggregate_score DECIMAL(10, 2),
        position INT,
        previous_position INT,
        status VARCHAR(20) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY student_term (student_id, term_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Term Summaries table created.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
