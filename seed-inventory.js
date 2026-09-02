const db = require('./config/db');
const crypto = require('crypto');

async function seed() {
    console.log("🚀 Seeding Inventory & Sales Data...");

    try {
        const garrisons = [
            { id: '3d529a77-1367-4f51-b9c7-8e3fe8b8111e', name: '3BN' },
            { id: '3a747d1e-fcbe-463f-bd9a-daa62544973a', name: '2BN' },
            { id: '5bf20299-43f5-4673-8bfc-add1031234ed', name: '1BN' }
        ];

        for (const garrison of garrisons) {
            const [schools] = await db.query("SELECT id FROM schools WHERE garrison_id = ?", [garrison.id]);
            const schoolId = schools[0]?.id;
            if (!schoolId) continue;

            const items = [
                { name: 'School Uniform (Primary)', cat: 'uniform', price: 85 },
                { name: 'Mathematics Textbook B1', cat: 'book', price: 45 },
                { name: 'Exercise Book (10 Pack)', cat: 'stationery', price: 25 }
            ];

            for (const item of items) {
                const itemId = crypto.randomUUID();
                await db.query(`INSERT INTO inventory_items (id, school_id, name, category, price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)`,
                    [itemId, schoolId, item.name, item.cat, item.price, 100]);

                // Record a few sales
                const [students] = await db.query("SELECT id FROM students WHERE school_id = ? LIMIT 3", [schoolId]);
                for (const student of students) {
                    await db.query(`INSERT INTO inventory_sales (id, item_id, school_id, garrison_id, student_id, quantity, unit_price, total_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'cash')`,
                        [crypto.randomUUID(), itemId, schoolId, garrison.id, student.id, 1, item.price, item.price]);
                }
            }
        }

        console.log("✅ Inventory Seeding Complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Inventory Seeding Interrupted:", err.message);
        process.exit(1);
    }
}

seed();
