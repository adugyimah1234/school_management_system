const db = require("../config/db");
const crypto = require("crypto");

class DutyService {
    async getRoster(user, filters = {}) {
        let query = `
            SELECT d.*, u.full_name as staff_name
            FROM duty_roster d
            JOIN users u ON d.user_id = u.id
        `;
        let params = [];
        let where = [];

        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole !== 'superadmin') {
            where.push("d.school_id = ?");
            params.push(user.school_id);
        }

        if (filters.start_date && filters.end_date) {
            where.push("d.start_date >= ? AND d.end_date <= ?");
            params.push(filters.start_date, filters.end_date);
        }

        if (where.length > 0) {
            query += " WHERE " + where.join(" AND ");
        }

        query += " ORDER BY d.start_date DESC";

        const [rows] = await db.query(query, params);
        return rows;
    }

    async createDuty(data, user) {
        const id = crypto.randomUUID();
        const record = {
            id,
            school_id: user.school_id,
            user_id: data.user_id,
            start_date: data.start_date,
            end_date: data.end_date,
            duty_type: data.duty_type,
            remarks: data.remarks || null
        };
        await db.query("INSERT INTO duty_roster SET ?", [record]);
        return record;
    }

    async deleteDuty(id) {
        await db.query("DELETE FROM duty_roster WHERE id = ?", [id]);
        return true;
    }

    async broadcastWeeklyRoster(user) {
        const commService = require('./communicationService');
        const [roster] = await db.query(`
            SELECT d.*, u.full_name, u.phone_number
            FROM duty_roster d
            JOIN users u ON d.user_id = u.id
            WHERE d.school_id = ? AND d.start_date >= CURRENT_DATE
            AND d.start_date <= DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)
        `, [user.school_id]);

        let count = 0;
        for (const item of roster) {
            if (item.phone_number) {
                const msg = `GARRISON REMINDER: Personnel ${item.full_name}, reminder of your assignment as ${item.duty_type} starting ${item.start_date}. Duty Command Status: ACTIVE.`;
                await commService.sendSMS(item.phone_number, msg);
                count++;
            }
        }
        return { count };
    }
}

module.exports = new DutyService();
