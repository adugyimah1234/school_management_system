const db = require("../config/db");
const cache = require("../utils/cacheManager");
const logger = require("../utils/logger");

class DashboardService {
  async getFinancialOverview(user) {
    try {
      const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
      const schoolId = user.school_id || 'all';
      const garrisonId = user.garrison_id || 'none';
      const cacheKey = `dashboard:financial:role_${normalizedRole}:school_${schoolId}:garrison_${garrisonId}`;

      // Check Cache
      try {
        const cached = await cache.get(cacheKey);
        if (cached) return cached;
      } catch (e) {
        logger.error('Redis error in DashboardService:', e.message);
      }

      // Build conditional WHERE clause based on role
      let whereClause = '';
      let params = [];

      if (normalizedRole === 'superadmin') {
        whereClause = '';
        params = [];
      } else if (normalizedRole === 'garrisondirector' || normalizedRole === 'admin') {
        whereClause = 'WHERE p.garrison_id = ?';
        params = [user.garrison_id];
      } else if (normalizedRole === 'schooladmin' || user.school_id) {
        whereClause = 'WHERE p.school_id = ?';
        params = [user.school_id];
      } else {
        whereClause = 'WHERE 1=0';
      }

      // 1. Financial summary using actual payments table
      const collectionsQuery = `
        SELECT COALESCE(SUM(amount_paid), 0) AS totalCollections
        FROM payments p
        ${whereClause}
      `;
      const [collectionsRows] = await db.query(collectionsQuery, params);

      // We'll calculate arrears/debt separately since it's complex
      const extendedMetrics = await this.getExtendedCommandMetrics(user, normalizedRole, params);

      const summary = {
        totalCollections: parseFloat(collectionsRows[0]?.totalCollections || 0),
        pendingPayments: 0, // Simplified for now
        outstandingBalance: extendedMetrics.total_debt,
        totalCollectionsChange: 5.1,
        outstandingBalanceChange: -2.4,
        pendingPaymentsChange: 1.2
      };

      // 2. Collection progress
      const target = 50000; // Mock target
      const collected = summary.totalCollections;
      const collectionProgress = {
        target,
        collected,
        remaining: Math.max(0, target - collected),
        percentage: target > 0 ? (collected / target) * 100 : 0,
      };

      // 3. Recent transactions using payments table directly
      const [transactions] = await db.query(`
        SELECT p.id, p.amount_paid as amount, p.method AS type, p.payment_date AS date,
               CONCAT(s.first_name, ' ', s.last_name) AS student_name
        FROM payments p
        JOIN students s ON p.student_id = s.id
        ${whereClause}
        ORDER BY p.payment_date DESC, p.created_at DESC
        LIMIT 5
      `, params);

      const result = {
        summary,
        collectionProgress,
        recentTransactions: transactions,
        extendedMetrics,
        cashFlow: await this.getCashFlowData(user, normalizedRole, params)
      };

      // Save to Cache
      try {
        await cache.set(cacheKey, result, 300);
      } catch (e) { }

      return result;
    } catch (err) {
      logger.error('Error in getFinancialOverview service: ' + err.message);
      throw err;
    }
  }

  async getCashFlowData(user, role, params) {
    try {
        let where = "";
        let whereParams = [];
        if (role !== 'superadmin') {
            where = user.school_id ? "WHERE school_id = ?" : "WHERE garrison_id = ?";
            whereParams = [user.school_id || user.garrison_id];
        }

        // Fetch last 6 months of Inflow vs Outflow
        const query = `
            SELECT
                DATE_FORMAT(d, '%Y-%m') as month,
                (
                    SELECT COALESCE(SUM(amount_paid), 0) FROM payments
                    ${where ? where + ' AND' : 'WHERE'}
                    DATE_FORMAT(payment_date, '%Y-%m') = DATE_FORMAT(d, '%Y-%m')
                ) as inflow,
                (
                    SELECT COALESCE(SUM(amount), 0) FROM expenses
                    ${where ? where + ' AND' : 'WHERE'}
                    DATE_FORMAT(expense_date, '%Y-%m') = DATE_FORMAT(d, '%Y-%m')
                ) as outflow
            FROM (
                SELECT CURRENT_DATE as d
                UNION SELECT DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)
                UNION SELECT DATE_SUB(CURRENT_DATE, INTERVAL 2 MONTH)
                UNION SELECT DATE_SUB(CURRENT_DATE, INTERVAL 3 MONTH)
                UNION SELECT DATE_SUB(CURRENT_DATE, INTERVAL 4 MONTH)
                UNION SELECT DATE_SUB(CURRENT_DATE, INTERVAL 5 MONTH)
            ) as months
            ORDER BY month ASC
        `;

        // Doubling params for subqueries
        let queryParams = [];
        if (role !== 'superadmin') {
            const id = user.school_id || user.garrison_id;
            queryParams = [id, id];
        }

        const [rows] = await db.query(query, queryParams);
        return rows.map(r => ({
            month: r.month,
            inflow: parseFloat(r.inflow || 0),
            outflow: parseFloat(r.outflow || 0)
        }));
    } catch (e) {
        logger.error("Cash Flow Data Error: " + e.message);
        return [];
    }
  }

  async getExtendedCommandMetrics(user, role, params) {
    try {
        let where = "";
        if (role !== 'superadmin') {
            where = user.school_id ? "WHERE school_id = ?" : "WHERE garrison_id = ?";
        }

        // 1. Debt Total
        const [debt] = await db.query(`
            SELECT SUM(balance) as total_debt FROM (
                SELECT
                    COALESCE((SELECT SUM(amount) FROM fees f WHERE f.class_id = s.class_id AND f.category_id = s.category_id), 0) -
                    COALESCE((SELECT SUM(amount_paid) FROM payments p WHERE p.student_id = s.id), 0) as balance
                FROM students s
                ${where}
            ) as ledger WHERE balance > 0
        `, params);

        // 2. Monthly Expenses
        const [expenses] = await db.query(`
            SELECT SUM(amount) as total FROM expenses
            ${where} ${where ? 'AND' : 'WHERE'} MONTH(expense_date) = MONTH(CURRENT_DATE) AND YEAR(expense_date) = YEAR(CURRENT_DATE)
        `, params);

        // 3. Active Exeats
        const [exeats] = await db.query(`
            SELECT COUNT(*) as count FROM exeats
            ${where} ${where ? 'AND' : 'WHERE'} status IN ('approved', 'departed')
        `, params);

        return {
            total_debt: parseFloat(debt[0]?.total_debt || 0),
            monthly_expenses: parseFloat(expenses[0]?.total || 0),
            active_exeats: parseInt(exeats[0]?.count || 0)
        };
    } catch (e) {
        logger.error("Extended Metrics Error: " + e.message);
        return { total_debt: 0, monthly_expenses: 0, active_exeats: 0 };
    }
  }
}

module.exports = new DashboardService();
