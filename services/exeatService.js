const db = require("../config/db");
const crypto = require("crypto");

class ExeatService {
    async getAllExeats(user, filters = {}) {
        let query = `
            SELECT e.*,
                CONCAT(s.first_name, ' ', s.last_name) as student_name,
                c.name as class_name,
                u1.full_name as approved_by_name,
                u2.full_name as recorded_by_name
            FROM exeats e
            JOIN students s ON e.student_id = s.id
            JOIN classes c ON s.class_id = c.id
            LEFT JOIN users u1 ON e.approved_by = u1.id
            LEFT JOIN users u2 ON e.recorded_by = u2.id
        `;
        let params = [];
        let where = [];

        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole === 'superadmin') {
            // No filter
        } else if (normalizedRole === 'garrisondirector' || normalizedRole === 'admin') {
            where.push("e.garrison_id = ?");
            params.push(user.garrison_id);
        } else {
            where.push("e.school_id = ?");
            params.push(user.school_id);
        }

        if (filters.status) {
            where.push("e.status = ?");
            params.push(filters.status);
        }

        if (where.length > 0) {
            query += " WHERE " + where.join(" AND ");
        }

        query += " ORDER BY e.departure_date DESC";

        const [rows] = await db.query(query, params);
        return rows;
    }

    async createExeat(data, user) {
        const id = crypto.randomUUID();
        const record = {
            id,
            student_id: data.student_id,
            school_id: user.school_id,
            garrison_id: user.garrison_id,
            exeat_type: data.exeat_type,
            departure_date: data.departure_date,
            expected_return_date: data.expected_return_date,
            reason: data.reason || null,
            status: 'approved', // Auto-approved if created by admin/staff for now
            approved_by: user.id,
            recorded_by: user.id
        };
        await db.query("INSERT INTO exeats SET ?", [record]);
        return record;
    }

    async updateStatus(id, status, user) {
        const updateData = { status };
        if (status === 'returned') {
            updateData.actual_return_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        await db.query("UPDATE exeats SET ? WHERE id = ?", [updateData, id]);
        return true;
    }

    async deleteExeat(id) {
        await db.query("DELETE FROM exeats WHERE id = ?", [id]);
        return true;
    }
}

module.exports = new ExeatService();
