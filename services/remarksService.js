const db = require("../config/db");
const crypto = require("crypto");

class RemarksService {
    async getAllRemarks(user) {
        let query = "SELECT * FROM remarks_bank";
        let params = [];
        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole !== 'superadmin') {
            // Include both school-specific and global (no school_id) remarks
            query += " WHERE (school_id = ? OR school_id IS NULL)";
            params = [user.school_id];
        }

        query += " ORDER BY category, remark_text ASC";
        const [rows] = await db.query(query, params);
        return rows;
    }

    async createRemark(data, user) {
        const id = crypto.randomUUID();
        const record = {
            id,
            school_id: user.school_id,
            garrison_id: user.garrison_id,
            category: data.category,
            remark_text: data.remark_text
        };
        await db.query("INSERT INTO remarks_bank SET ?", [record]);
        return record;
    }

    async deleteRemark(id) {
        await db.query("DELETE FROM remarks_bank WHERE id = ?", [id]);
        return true;
    }
}

module.exports = new RemarksService();
