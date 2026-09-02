const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function migrate() {
  console.log('🚀 Starting SaaS Multi-Tenancy & UUID Data Migration...');

  // Connect without DB selected to create school_db_saas
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '_Morrison.1',
    port: process.env.DB_PORT || 3307,
    multipleStatements: true
  });

  const sourceDb = 'school_db';
  const targetDb = 'school_db_saas';

  try {
    console.log(`📦 Creating target database: ${targetDb}`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${targetDb};`);
    await conn.query(`USE ${targetDb};`);

    // Disable FK checks during schema setup & data insertion
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 1. Roles
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT
      );
    `);

    // 2. Garrisons (Tenants)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS garrisons (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // 3. Schools
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id VARCHAR(36) PRIMARY KEY,
        garrison_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        phone_number VARCHAR(20),
        email VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE
      );
    `);

    // 4. Users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255) NOT NULL,
        role_id VARCHAR(36) NOT NULL,
        garrison_id VARCHAR(36),
        school_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id),
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE SET NULL,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
      );
    `);

    // 5. Academic Years
    await conn.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id VARCHAR(36) PRIMARY KEY,
        year VARCHAR(20) NOT NULL,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // 6. Categories
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) DEFAULT 0.00,
        code VARCHAR(45),
        description VARCHAR(255),
        status VARCHAR(45)
      );
    `);

    // 7. Classes
    await conn.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36) NOT NULL,
        garrison_id VARCHAR(36) NOT NULL,
        name VARCHAR(50) NOT NULL,
        level INT,
        slots INT DEFAULT 0,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE
      );
    `);

    // 8. Students
    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36) NOT NULL,
        garrison_id VARCHAR(36) NOT NULL,
        category_id VARCHAR(36),
        class_id VARCHAR(36),
        academic_year_id VARCHAR(36),
        first_name VARCHAR(50) NOT NULL,
        middle_name VARCHAR(50),
        last_name VARCHAR(50) NOT NULL,
        dob DATE NOT NULL,
        gender ENUM('Male','Female') NOT NULL,
        jersey_size VARCHAR(16),
        registration_date DATE,
        admission_status ENUM('registered','admitted','in_school'),
        status ENUM('active','inactive','graduated') DEFAULT 'active',
        scores INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE
      );
    `);

    // 9. Registrations
    await conn.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        student_id VARCHAR(36),
        first_name VARCHAR(255),
        middle_name VARCHAR(255),
        last_name VARCHAR(255),
        category VARCHAR(50),
        date_of_birth DATE,
        class_applying_for VARCHAR(50),
        gender VARCHAR(10),
        email VARCHAR(255),
        phone_number VARCHAR(20),
        address TEXT,
        previous_school VARCHAR(255),
        guardian_name VARCHAR(255),
        relationship VARCHAR(100),
        guardian_phone_number VARCHAR(20),
        academic_year_id VARCHAR(36),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        payment_type ENUM('cash','momo','credit card') DEFAULT 'cash',
        payment_status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
        scores INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // 10. Receipts
    await conn.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36),
        payment_id VARCHAR(36),
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        class_id VARCHAR(36),
        registration_id VARCHAR(36),
        issued_by VARCHAR(36),
        receipt_type VARCHAR(100),
        amount DECIMAL(10,2),
        date_issued DATE,
        venue VARCHAR(100),
        logo_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (garrison_id) REFERENCES garrisons(id) ON DELETE CASCADE
      );
    `);

    // 11. Receipt Items
    await conn.query(`
      CREATE TABLE IF NOT EXISTS receipt_items (
        id VARCHAR(36) PRIMARY KEY,
        receipt_id VARCHAR(36) NOT NULL,
        receipt_type VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
      );
    `);

    // 12. Fee Presets
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fee_presets (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        type VARCHAR(50) NOT NULL,
        category VARCHAR(50),
        class_name VARCHAR(50),
        amount DECIMAL(10,2) NOT NULL
      );
    `);

    // 13. Fee Amounts
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fee_amounts (
        id VARCHAR(36) PRIMARY KEY,
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        fee_type VARCHAR(50) NOT NULL,
        category_name VARCHAR(50),
        class_name VARCHAR(50),
        amount DECIMAL(10,2) NOT NULL
      );
    `);

    // 14. Payments
    await conn.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36),
        fee_id VARCHAR(36),
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        amount_paid DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        installment_number INT DEFAULT 1,
        recorded_by VARCHAR(36),
        type VARCHAR(50),
        method VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Admissions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admissions (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36) NOT NULL,
        admitted_by VARCHAR(36),
        class_id VARCHAR(36),
        school_id VARCHAR(36),
        garrison_id VARCHAR(36),
        admission_date DATE NOT NULL
      );
    `);

    // 16. Parents
    await conn.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id VARCHAR(36) PRIMARY KEY,
        student_id VARCHAR(36) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        relationship ENUM('father','mother','guardian') DEFAULT 'guardian',
        phone_number VARCHAR(20),
        email VARCHAR(100),
        address TEXT
      );
    `);

    // 17. Modules
    await conn.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        path VARCHAR(100) NOT NULL,
        description TEXT,
        parent_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // 18. User Module Access
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_module_access (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        module_id VARCHAR(50) NOT NULL,
        has_access TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log('✅ Tables created successfully.');

    // Seed Default Tenant (3 Infantry Battalion)
    const defaultGarrisonId = crypto.randomUUID();
    await conn.query(`
      INSERT INTO garrisons (id, name, code, location)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name);
    `, [defaultGarrisonId, '3 Infantry Battalion', '3GAR', 'Sunyani']);
    console.log(`🏰 Default Tenant Created: 3 Infantry Battalion (${defaultGarrisonId})`);

    // Seed Standard Roles
    const roleDefinitions = [
      { name: 'superadmin', description: 'Platform System Overseer' },
      { name: 'admin', description: 'Garrison Director / Unit Overseer' },
      { name: 'teacher', description: 'School Teacher' },
      { name: 'frontdesk', description: 'Front Desk Staff' },
      { name: 'accountant', description: 'School Accountant' },
      { name: 'staff', description: 'General Staff Member' }
    ];

    const roleMap = {}; // role name -> UUID
    for (const r of roleDefinitions) {
      const uId = crypto.randomUUID();
      await conn.query(`
        INSERT INTO roles (id, name, description) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE description=VALUES(description);
      `, [uId, r.name, r.description]);
      
      const [fetched] = await conn.query('SELECT id FROM roles WHERE name = ?', [r.name]);
      roleMap[r.name] = fetched[0].id;
    }
    console.log('👥 Standard Roles Seeded & Mapped:', roleMap);

    // Read source database tables to map IDs
    const schoolMap = {};
    const categoryMap = {};
    const classMap = {};
    const academicYearMap = {};
    const studentMap = {};
    const registrationMap = {};
    const receiptMap = {};
    const userMap = {};

    // Helper clean text function
    const cleanStr = (val) => {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === '' ? null : s;
    };

    // 1. Migrate Schools
    const [sourceSchools] = await conn.query(`SELECT * FROM ${sourceDb}.schools`);
    for (const s of sourceSchools) {
      const newId = crypto.randomUUID();
      schoolMap[s.id] = newId;
      await conn.query(`
        INSERT INTO schools (id, garrison_id, name, address, phone_number, email)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [newId, defaultGarrisonId, cleanStr(s.name), cleanStr(s.address), cleanStr(s.phone_number), cleanStr(s.email)]);
    }
    console.log(`🏫 Migrated ${sourceSchools.length} schools.`);

    // 2. Migrate Categories
    const [sourceCats] = await conn.query(`SELECT * FROM ${sourceDb}.categories`);
    for (const c of sourceCats) {
      const newId = crypto.randomUUID();
      categoryMap[c.id] = newId;
      await conn.query(`
        INSERT INTO categories (id, name, amount, code, description, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [newId, cleanStr(c.name), c.amount || 0, cleanStr(c.code), cleanStr(c.description), cleanStr(c.status)]);
    }

    // 3. Migrate Classes
    const [sourceClasses] = await conn.query(`SELECT * FROM ${sourceDb}.classes`);
    for (const c of sourceClasses) {
      const newId = crypto.randomUUID();
      classMap[c.id] = newId;
      const sUuid = schoolMap[c.school_id] || Object.values(schoolMap)[0];
      await conn.query(`
        INSERT INTO classes (id, school_id, garrison_id, name, level, slots)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [newId, sUuid, defaultGarrisonId, cleanStr(c.name), c.level || 1, c.slots || 0]);
    }

    // 4. Migrate Academic Years
    const [sourceYears] = await conn.query(`SELECT * FROM ${sourceDb}.academic_years`);
    for (const y of sourceYears) {
      const newId = crypto.randomUUID();
      academicYearMap[y.id] = newId;
      await conn.query(`
        INSERT INTO academic_years (id, year, start_date, end_date)
        VALUES (?, ?, ?, ?)
      `, [newId, cleanStr(y.year), y.start_date || null, y.end_date || null]);
    }

    // 5. Migrate Users
    const [oldRoles] = await conn.query(`SELECT * FROM ${sourceDb}.roles`);
    const oldRoleIdToNameMap = {};
    oldRoles.forEach(r => { oldRoleIdToNameMap[r.id] = r.name; });

    const [sourceUsers] = await conn.query(`SELECT * FROM ${sourceDb}.users`);
    for (const u of sourceUsers) {
      const newId = crypto.randomUUID();
      userMap[u.id] = newId;
      const oldRoleName = oldRoleIdToNameMap[u.role_id] || 'staff';
      // Map old role 'admin' to 'admin' (or superadmin if username is admin)
      let targetRoleName = 'admin';
      if (u.username === 'admin') {
        targetRoleName = 'superadmin';
      } else if (roleMap[oldRoleName]) {
        targetRoleName = oldRoleName;
      }
      const rId = roleMap[targetRoleName] || roleMap['admin'];
      const sId = schoolMap[u.school_id] || null;
      const gId = targetRoleName === 'superadmin' ? null : defaultGarrisonId;

      await conn.query(`
        INSERT INTO users (id, full_name, username, email, password, role_id, garrison_id, school_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [newId, cleanStr(u.full_name), cleanStr(u.username), cleanStr(u.email), u.password, rId, gId, sId]);
    }
    console.log(`👤 Migrated ${sourceUsers.length} user accounts.`);

    // 6. Migrate Students
    const [sourceStudents] = await conn.query(`SELECT * FROM ${sourceDb}.students`);
    for (const st of sourceStudents) {
      const newId = crypto.randomUUID();
      studentMap[st.id] = newId;
      const sId = schoolMap[st.school_id] || Object.values(schoolMap)[0];
      const cId = categoryMap[st.category_id] || null;
      const clId = classMap[st.class_id] || null;
      const ayId = academicYearMap[st.academic_year_id] || null;

      await conn.query(`
        INSERT INTO students (id, school_id, garrison_id, category_id, class_id, academic_year_id, first_name, middle_name, last_name, dob, gender, jersey_size, registration_date, admission_status, status, scores)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        sId,
        defaultGarrisonId,
        cId,
        clId,
        ayId,
        cleanStr(st.first_name) || 'Unknown',
        cleanStr(st.middle_name),
        cleanStr(st.last_name) || 'Student',
        st.dob || '2000-01-01',
        st.gender === 'Female' ? 'Female' : 'Male',
        cleanStr(st.jersey_size),
        st.registration_date || null,
        st.admission_status || 'registered',
        st.status || 'active',
        st.scores || 0
      ]);
    }
    console.log(`🎓 Migrated ${sourceStudents.length} students.`);

    // 7. Migrate Registrations
    const [sourceRegs] = await conn.query(`SELECT * FROM ${sourceDb}.registrations`);
    for (const rg of sourceRegs) {
      const newId = crypto.randomUUID();
      registrationMap[rg.id] = newId;
      const stUuid = studentMap[rg.id] || null; // Best effort map or null
      const ayUuid = academicYearMap[rg.academic_year_id] || null;

      await conn.query(`
        INSERT INTO registrations (id, school_id, garrison_id, student_id, first_name, middle_name, last_name, category, date_of_birth, class_applying_for, gender, email, phone_number, address, previous_school, guardian_name, relationship, guardian_phone_number, academic_year_id, registration_date, status, payment_type, payment_status, scores)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        Object.values(schoolMap)[0],
        defaultGarrisonId,
        stUuid,
        cleanStr(rg.first_name),
        cleanStr(rg.middle_name),
        cleanStr(rg.last_name),
        cleanStr(rg.category),
        rg.date_of_birth || null,
        cleanStr(rg.class_applying_for),
        cleanStr(rg.gender),
        cleanStr(rg.email),
        cleanStr(rg.phone_number),
        cleanStr(rg.address),
        cleanStr(rg.previous_school),
        cleanStr(rg.guardian_name),
        cleanStr(rg.relationship),
        cleanStr(rg.guardian_phone_number),
        ayUuid,
        rg.registration_date || null,
        rg.status || 'pending',
        rg.payment_type || 'cash',
        rg.payment_status || 'unpaid',
        rg.scores || null
      ]);
    }
    console.log(`📋 Migrated ${sourceRegs.length} registrations.`);

    // 8. Migrate Receipts
    const [sourceReceipts] = await conn.query(`SELECT * FROM ${sourceDb}.receipts`);
    for (const rc of sourceReceipts) {
      const newId = crypto.randomUUID();
      receiptMap[rc.id] = newId;
      const stUuid = studentMap[rc.student_id] || null;
      const scUuid = schoolMap[rc.school_id] || Object.values(schoolMap)[0];
      const clUuid = classMap[rc.class_id] || null;
      const usrUuid = userMap[rc.issued_by] || null;
      const regUuid = registrationMap[rc.registration_id] || null;

      await conn.query(`
        INSERT INTO receipts (id, student_id, payment_id, school_id, garrison_id, class_id, registration_id, issued_by, receipt_type, amount, date_issued, venue, logo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        stUuid,
        null,
        scUuid,
        defaultGarrisonId,
        clUuid,
        regUuid,
        usrUuid,
        cleanStr(rc.receipt_type),
        rc.amount || 0,
        rc.date_issued || null,
        cleanStr(rc.venue),
        cleanStr(rc.logo_url)
      ]);
    }
    console.log(`🧾 Migrated ${sourceReceipts.length} receipts.`);

    // 9. Migrate Receipt Items
    const [sourceItems] = await conn.query(`SELECT * FROM ${sourceDb}.receipt_items`);
    let migratedItems = 0;
    for (const item of sourceItems) {
      const rcUuid = receiptMap[item.receipt_id];
      if (rcUuid) {
        const newItemId = crypto.randomUUID();
        await conn.query(`
          INSERT INTO receipt_items (id, receipt_id, receipt_type, amount)
          VALUES (?, ?, ?, ?)
        `, [newItemId, rcUuid, cleanStr(item.receipt_type) || 'Fee', item.amount || 0]);
        migratedItems++;
      }
    }
    console.log(`🧾 Migrated ${migratedItems} receipt line items.`);

    // 10. Migrate Fee Amounts & Presets
    const [sourcePresets] = await conn.query(`SELECT * FROM ${sourceDb}.fee_presets`);
    for (const fp of sourcePresets) {
      const newId = crypto.randomUUID();
      await conn.query(`
        INSERT INTO fee_presets (id, school_id, garrison_id, type, category, class_name, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [newId, Object.values(schoolMap)[0], defaultGarrisonId, cleanStr(fp.type), cleanStr(fp.category), cleanStr(fp.class_name), fp.amount || 0]);
    }

    const [sourceAmounts] = await conn.query(`SELECT * FROM ${sourceDb}.fee_amounts`);
    for (const fa of sourceAmounts) {
      const newId = crypto.randomUUID();
      await conn.query(`
        INSERT INTO fee_amounts (id, school_id, garrison_id, fee_type, category_name, class_name, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [newId, Object.values(schoolMap)[0], defaultGarrisonId, cleanStr(fa.fee_type), cleanStr(fa.category_name), cleanStr(fa.class_name), fa.amount || 0]);
    }

    // Re-enable FK checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration Error:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

migrate();
