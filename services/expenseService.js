const db = require("../config/db");
const crypto = require("crypto");

class ExpenseService {
    async getAllExpenses(user, filters = {}) {
        let query = `
            SELECT e.*, u.full_name as recorded_by_name, s.name as school_name
            FROM expenses e
            LEFT JOIN users u ON e.recorded_by = u.id
            LEFT JOIN schools s ON e.school_id = s.id
        `;
        let params = [];
        let where = [];

        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole === 'superadmin') {
            // No school/garrison filter
        } else if (normalizedRole === 'garrisondirector' || normalizedRole === 'admin') {
            where.push("e.garrison_id = ?");
            params.push(user.garrison_id);
        } else {
            where.push("e.school_id = ?");
            params.push(user.school_id);
        }

        if (filters.category) {
            where.push("e.category = ?");
            params.push(filters.category);
        }

        if (filters.start_date && filters.end_date) {
            where.push("e.expense_date BETWEEN ? AND ?");
            params.push(filters.start_date, filters.end_date);
        }

        if (where.length > 0) {
            query += " WHERE " + where.join(" AND ");
        }

        query += " ORDER BY e.expense_date DESC";

        const [rows] = await db.query(query, params);
        return rows;
    }

    async createExpense(data, user) {
        const id = crypto.randomUUID();
        const record = {
            id,
            school_id: user.school_id,
            garrison_id: user.garrison_id,
            category: data.category,
            amount: data.amount,
            description: data.description || null,
            expense_date: data.expense_date || new Date().toISOString().split('T')[0],
            recorded_by: user.id,
            receipt_url: data.receipt_url || null
        };
        await db.query("INSERT INTO expenses SET ?", [record]);
        return record;
    }

    async deleteExpense(id) {
        await db.query("DELETE FROM expenses WHERE id = ?", [id]);
        return true;
    }

    async getSummary(user) {
        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        let where = "";
        let params = [];

        if (normalizedRole !== 'superadmin') {
            if (user.school_id) {
                where = "WHERE school_id = ?";
                params = [user.school_id];
            } else {
                where = "WHERE garrison_id = ?";
                params = [user.garrison_id];
            }
        }

        const [summary] = await db.query(`
            SELECT
                SUM(amount) as total_expenses,
                category,
                COUNT(*) as count
            FROM expenses
            ${where}
            GROUP BY category
        `, params);

        return summary;
    }
}

module.exports = new ExpenseService();
