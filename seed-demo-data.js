const db = require('./config/db');
const crypto = require('crypto');

async function seed() {
    console.log("🚀 Initializing Strategic Data Seeding Protocol...");

    try {
        const academicYearId = '4f4b2c5e-e91c-4896-9848-9726af5e328e';
        const garrisons = [
            { id: '3d529a77-1367-4f51-b9c7-8e3fe8b8111e', name: '3BN' },
            { id: '3a747d1e-fcbe-463f-bd9a-daa62544973a', name: '2BN' },
            { id: '5bf20299-43f5-4673-8bfc-add1031234ed', name: '1BN' }
        ];

        const today = new Date();

        for (const garrison of garrisons) {
            console.log(`📡 Seeding Node: ${garrison.name}...`);

            // 1. Ensure Garrison has a School
            let [schools] = await db.query("SELECT id FROM schools WHERE garrison_id = ?", [garrison.id]);
            if (schools.length === 0) {
                const schoolId = crypto.randomUUID();
                await db.query(`INSERT INTO schools (id, name, garrison_id) VALUES (?, ?, ?)`,
                    [schoolId, `${garrison.name} REGIMENTAL SCHOOL`, garrison.id]);
                schools = [{ id: schoolId }];
            }

            const schoolId = schools[0].id;

            // 2. Ensure Categories exist
            let [categories] = await db.query("SELECT id FROM categories WHERE garrison_id = ?", [garrison.id]);
            if (categories.length === 0) {
                const cat1 = crypto.randomUUID();
                const cat2 = crypto.randomUUID();
                await db.query(`INSERT INTO categories (id, name, amount, garrison_id) VALUES (?, 'SVC', 200, ?), (?, 'CIV', 220, ?)`,
                    [cat1, garrison.id, cat2, garrison.id]);
                categories = [{ id: cat1 }, { id: cat2 }];
            }
            const catIds = categories.map(c => c.id);

            // 3. Ensure Classes exist
            let [classes] = await db.query("SELECT id FROM classes WHERE school_id = ?", [schoolId]);
            if (classes.length === 0) {
                const classNames = ['BASIC 1', 'BASIC 2', 'BASIC 3', 'BASIC 4', 'BASIC 5'];
                for (const name of classNames) {
                    await db.query(`INSERT INTO classes (id, school_id, garrison_id, name, level, slots) VALUES (?, ?, ?, ?, 1, 30)`,
                        [crypto.randomUUID(), schoolId, garrison.id, name]);
                }
                [classes] = await db.query("SELECT id FROM classes WHERE school_id = ?", [schoolId]);
            }

            const firstNames = ["Kofi", "Ama", "Kwame", "Adjoa", "Kwesi", "Abena", "Kwaku", "Akua", "Yaw", "Yaa"];
            const lastNames = ["Mensah", "Ansah", "Osei", "Appiah", "Baah", "Donkor", "Gyamfi", "Owusu"];

            console.log(`   📝 Populating Personnel & Ledger for ${garrison.name}...`);

            for (let i = 0; i < 15; i++) {
                const studentId = crypto.randomUUID();
                const cls = classes[Math.floor(Math.random() * classes.length)];
                const catId = catIds[Math.floor(Math.random() * catIds.length)];
                const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lname = lastNames[Math.floor(Math.random() * lastNames.length)];

                // Student
                await db.query(`
                    INSERT INTO students (id, school_id, garrison_id, category_id, class_id, academic_year_id, first_name, last_name, dob, gender, admission_status, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [studentId, schoolId, garrison.id, catId, cls.id, academicYearId, fname, lname, '2016-01-01', i % 2 === 0 ? 'Male' : 'Female', 'admitted', 'active']
                );

                // Payments (Mix of full and partial)
                const amount = i % 3 === 0 ? 100.00 : 200.00;
                await db.query(`
                    INSERT INTO payments (id, student_id, school_id, garrison_id, amount_paid, payment_date, type, method, transaction_reference)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [crypto.randomUUID(), studentId, schoolId, garrison.id, amount, today, 'levy', 'cash', `TRX-${garrison.name}-${i}-${Date.now()}`]
                );
            }

            // Pending Applicants
            for (let j = 0; j < 3; j++) {
                const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
                const cls = classes[Math.floor(Math.random() * classes.length)];
                const catId = catIds[Math.floor(Math.random() * catIds.length)];
                const catName = categories.find(c => c.id === catId)?.name || 'SVC';

                await db.query(`
                    INSERT INTO registrations (id, school_id, garrison_id, first_name, last_name, gender, status, payment_status, phone_number, address, class_applying_for, category, academic_year_id)
                    VALUES (?, ?, ?, ?, ?, ?, 'pending', 'unpaid', '0241111111', 'Garrison Base', ?, ?, ?)`,
                    [crypto.randomUUID(), schoolId, garrison.id, fname, lname, j % 2 === 0 ? 'Male' : 'Female', cls.name, catName, academicYearId]
                );
            }

            // Expenses
            await db.query(`
                INSERT INTO expenses (id, school_id, garrison_id, category, amount, description, expense_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [crypto.randomUUID(), schoolId, garrison.id, 'utilities', 300.00, 'Operations Node Energy Cost', today]
            );
        }

        console.log("✅ Multi-Garrison Strategic Data Sync Complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding Interrupted:", err.message);
        process.exit(1);
    }
}

seed();
