const db = require("../config/db");

async function migrate() {
  try {
    console.log("Starting Academic & Financial Upgrade Migration...");

    // 1. Subjects Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Subjects table created.");

    // 2. Academic Terms Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS academic_terms (
        id VARCHAR(36) PRIMARY KEY,
        academic_year_id VARCHAR(36),
        name VARCHAR(50) NOT NULL, -- e.g., Term 1, Term 2, Michaelmas
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Academic Terms table created.");

    // 3. Student Marks (Gradebook)
    await db.query(`
      CREATE TABLE IF NOT EXISTS student_marks (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36),
        subject_id VARCHAR(36),
        term_id VARCHAR(36),
        ca_score DECIMAL(5,2) DEFAULT 0,
        exam_score DECIMAL(5,2) DEFAULT 0,
        total_score DECIMAL(5,2) DEFAULT 0,
        grade VARCHAR(5),
        teacher_remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY student_subject_term (student_id, subject_id, term_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Student Marks table created.");

    // 4. Discipline Log
    await db.query(`
      CREATE TABLE IF NOT EXISTS discipline_logs (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36),
        offense TEXT NOT NULL,
        action_taken TEXT,
        date_occurred DATE,
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
        recorded_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Discipline Logs table created.");

    // 5. Inventory Items (Essentials Store)
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        name VARCHAR(100) NOT NULL,
        category ENUM('uniform', 'book', 'stationery', 'other') DEFAULT 'other',
        price DECIMAL(10,2) NOT NULL,
        stock_quantity INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Inventory Items table created.");

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
