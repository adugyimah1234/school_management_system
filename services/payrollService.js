const db = require("../config/db");
const crypto = require("crypto");
const logger = require("../utils/logger");

class PayrollService {
    async getStaffPayrollSettings(user) {
        let query = `
            SELECT u.id as user_id, u.full_name, r.name as role_name, ps.base_salary, ps.allowances, ps.deductions
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN payroll_settings ps ON u.id = ps.user_id
        `;
        let params = [];
        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole !== 'superadmin') {
            query += " WHERE u.school_id = ?";
            params = [user.school_id];
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    async updatePayrollSettings(data) {
        const { user_id, base_salary, allowances, deductions } = data;
        const id = crypto.randomUUID();

        await db.query(`
            INSERT INTO payroll_settings (id, user_id, base_salary, allowances, deductions)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                base_salary = VALUES(base_salary),
                allowances = VALUES(allowances),
                deductions = VALUES(deductions)
        `, [id, user_id, base_salary, allowances, deductions]);

        return { success: true };
    }

    async generateMonthlyDraft(month, year, user) {
        const settings = await this.getStaffPayrollSettings(user);
        const results = [];

        for (const staff of settings) {
            const base = parseFloat(staff.base_salary || 0);
            const allow = parseFloat(staff.allowances || 0);
            const deduct = parseFloat(staff.deductions || 0);
            const net = base + allow - deduct;

            if (base > 0) {
                try {
                    const id = crypto.randomUUID();
                    await db.query(`
                        INSERT IGNORE INTO payroll_history
                        (id, user_id, school_id, garrison_id, month, year, base_salary, allowances, deductions, net_salary, payment_status, recorded_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
                    `, [id, staff.user_id, user.school_id, user.garrison_id, month, year, base, allow, deduct, net, user.id]);

                    results.push({ staff_name: staff.full_name, net_salary: net, status: 'draft' });
                } catch (e) {
                    logger.error("Payroll Draft Error: " + e.message);
                }
            }
        }
        return results;
    }

    async getPayrollHistory(month, year, user) {
        let query = `
            SELECT ph.*, u.full_name as staff_name, r.name as role_name
            FROM payroll_history ph
            JOIN users u ON ph.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE ph.month = ? AND ph.year = ?
        `;
        let params = [month, year];
        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole !== 'superadmin') {
            query += " AND ph.school_id = ?";
            params.push(user.school_id);
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    async processPayment(payrollId, user) {
        await db.query(`
            UPDATE payroll_history
            SET payment_status = 'paid', payment_date = CURRENT_DATE
            WHERE id = ?
        `, [payrollId]);

        // Integrate with Expenses table
        const [[pay]] = await db.query("SELECT * FROM payroll_history WHERE id = ?", [payrollId]);
        const [[staff]] = await db.query("SELECT full_name FROM users WHERE id = ?", [pay.user_id]);

        await db.query(`
            INSERT INTO expenses (id, school_id, garrison_id, category, amount, description, expense_date, recorded_by)
            VALUES (?, ?, ?, 'salaries', ?, ?, CURRENT_DATE, ?)
        `, [crypto.randomUUID(), pay.school_id, pay.garrison_id, pay.net_salary, `Salary Payment: ${staff.full_name} (${pay.month}/${pay.year})`, user.id]);

        return { success: true };
    }
}

module.exports = new PayrollService();
