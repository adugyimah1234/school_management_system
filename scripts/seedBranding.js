const db = require('../config/db');
const crypto = require('crypto');

async function seed() {
    try {
        console.log('Seeding Institutional Branding & API Defaults...');

        const settings = [
            { group: 'branding', key: 'primary_header', value: 'GARRISON SCHOOL MANAGEMENT SYSTEM' },
            { group: 'branding', key: 'sub_header', value: 'Headquarters Directorate, Ghana Armed Forces' },
            { group: 'branding', key: 'footer_text', value: 'Institutional generated document.' },
            { group: 'api_gateway', key: 'master_token', value: `GAR_LIVE_${crypto.randomBytes(8).toString('hex')}` },
            { group: 'grade_governance', key: 'ca_weight', value: 40 },
            { group: 'grade_governance', key: 'exam_weight', value: 60 },
            { group: 'grade_governance', key: 'local_autonomy', value: false },
        ];

        for (const s of settings) {
            await db.query(
                'INSERT INTO settings (setting_group, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [s.group, s.key, JSON.stringify(s.value), JSON.stringify(s.value)]
            );
        }

        console.log('✅ Seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
