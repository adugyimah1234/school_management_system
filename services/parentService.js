const db = require("../config/db");
const logger = require("../utils/logger");

class ParentService {
    async getAllParents(user) {
        // Group by phone number to identify families
        let query = `
            SELECT
                phone_number,
                full_name,
                address,
                COUNT(student_id) as ward_count
            FROM parents
            GROUP BY phone_number, full_name, address
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    async getParentDashboard(phoneNumber, user) {
        // 1. Get Wards
        const [wards] = await db.query(`
            SELECT s.*, c.name as class_name, sch.name as school_name
            FROM students s
            JOIN parents p ON s.id = p.student_id
            JOIN classes c ON s.class_id = c.id
            JOIN schools sch ON s.school_id = sch.id
            WHERE p.phone_number = ?
        `, [phoneNumber]);

        const dashboardData = [];

        for (const ward of wards) {
            // Get Academic Summary
            const [marks] = await db.query(`
                SELECT AVG(total_score) as avg_score
                FROM student_marks
                WHERE student_id = ?
            `, [ward.id]);

            // Get Financial Summary
            const [payments] = await db.query(`
                SELECT SUM(amount_paid) as paid FROM payments WHERE student_id = ?
            `, [ward.id]);

            const [fees] = await db.query(`
                SELECT SUM(amount) as total FROM fees
                WHERE class_id = ? AND category_id = ?
            `, [ward.class_id, ward.category_id]);

            dashboardData.push({
                student: ward,
                academic: {
                    average: parseFloat(marks[0]?.avg_score || 0).toFixed(1)
                },
                financial: {
                    total: parseFloat(fees[0]?.total || 0),
                    paid: parseFloat(payments[0]?.paid || 0),
                    balance: parseFloat(fees[0]?.total || 0) - parseFloat(payments[0]?.paid || 0)
                }
            });
        }

        return {
            guardian_phone: phoneNumber,
            wards: dashboardData
        };
    }

    async broadcastFamilyStatus(phoneNumber, user) {
        const commService = require('./communicationService');
        const data = await this.getParentDashboard(phoneNumber, user);

        if (!data.wards || data.wards.length === 0) return { success: false, msg: "No wards found" };

        const guardianName = data.wards[0].student.guardian_name;
        const totalDebt = data.wards.reduce((sum, w) => sum + w.financial.balance, 0);
        const wardNames = data.wards.map(w => w.student.first_name).join(', ');

        let msg = `GARRISON COMMAND: Dear ${guardianName}, Consolidated status for your wards (${wardNames}). Total family balance outstanding: GHS ${totalDebt.toFixed(2)}. `;

        if (totalDebt > 0) {
            msg += `Reference Student ID ${data.wards[0].student.id.substring(0,8).toUpperCase()} for MoMo payments. `;
        } else {
            msg += `Your account is fully cleared. Thank you for your partnership. `;
        }

        msg += `Command HQ.`;

        await commService.sendSMS(phoneNumber, msg);
        return { success: true, total_debt: totalDebt };
    }
}

module.exports = new ParentService();
