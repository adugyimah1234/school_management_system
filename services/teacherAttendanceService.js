const db = require("../config/db");
const crypto = require("crypto");

class TeacherAttendanceService {
    async checkIn(user, notes = null) {
        const id = crypto.randomUUID();
        const now = new Date();
        const hour = now.getHours();

        // Garrison logic: check-in after 8:00 AM is 'late'
        let status = 'present';
        if (hour >= 8) status = 'late';

        await db.query(`
            INSERT INTO teacher_attendance (id, user_id, school_id, check_in, status, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, user.id, user.school_id, now.toISOString().slice(0, 19).replace('T', ' '), status, notes]);

        return { id, status, check_in: now };
    }

    async checkOut(user) {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.query(`
            UPDATE teacher_attendance
            SET check_out = ?
            WHERE user_id = ? AND check_out IS NULL
            ORDER BY check_in DESC LIMIT 1
        `, [now, user.id]);
        return { success: true };
    }

    async getAttendanceRegistry(user, filters = {}) {
        let query = `
            SELECT ta.*, u.full_name, r.name as role_name
            FROM teacher_attendance ta
            JOIN users u ON ta.user_id = u.id
            JOIN roles r ON u.role_id = r.id
        `;
        let params = [];
        let where = [];

        if (user.role !== 'superadmin') {
            where.push("ta.school_id = ?");
            params.push(user.school_id);
        }

        if (filters.date) {
            where.push("DATE(ta.check_in) = ?");
            params.push(filters.date);
        }

        if (where.length > 0) query += " WHERE " + where.join(" AND ");
        query += " ORDER BY ta.check_in DESC";

        const [rows] = await db.query(query, params);
        return rows;
    }

    async getTeacherStats(userId) {
        const [rows] = await db.query(`
            SELECT
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as punctual_days
            FROM teacher_attendance
            WHERE user_id = ?
        `, [userId]);

        // Also check Duty Compliance
        const [duty] = await db.query(`
            SELECT COUNT(*) as total_duties
            FROM duty_roster
            WHERE user_id = ? AND end_date < CURRENT_DATE
        `, [userId]);

        return {
            attendance: rows[0],
            duty_compliance: duty[0].total_duties
        };
    }
}

module.exports = new TeacherAttendanceService();
