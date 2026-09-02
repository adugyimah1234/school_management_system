const db = require("../config/db");
const crypto = require("crypto");
const logger = require("../utils/logger");

class InventoryService {
    async getAllItems(user) {
        let query = "SELECT i.* FROM inventory_items i";
        let params = [];
        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');

        if (normalizedRole !== 'superadmin') {
            if (user.school_id) {
                // School Admin: See items for their school OR global items (school_id IS NULL)
                query += " WHERE i.school_id = ? OR i.school_id IS NULL";
                params = [user.school_id];
            } else if (user.garrison_id) {
                // Garrison Director: See all items for schools in their garrison OR global items
                query += " LEFT JOIN schools sch ON i.school_id = sch.id";
                query += " WHERE sch.garrison_id = ? OR i.school_id IS NULL";
                params = [user.garrison_id];
            } else {
                return [];
            }
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    async createItem(data, user) {
        const id = crypto.randomUUID();
        const record = {
            id,
            school_id: user.school_id,
            name: data.name,
            category: data.category,
            price: data.price,
            stock_quantity: data.stock_quantity || 0
        };
        await db.query("INSERT INTO inventory_items SET ?", [record]);
        return record;
    }

    async updateItem(id, data) {
        await db.query("UPDATE inventory_items SET ? WHERE id = ?", [data, id]);
        return true;
    }

    async deleteItem(id) {
        await db.query("DELETE FROM inventory_items WHERE id = ?", [id]);
        return true;
    }

    async adjustStock(id, quantity) {
        // quantity can be negative for sales
        await db.query("UPDATE inventory_items SET stock_quantity = stock_quantity + ? WHERE id = ?", [quantity, id]);
        return true;
    }

    async recordSaleRecord(saleData) {
        const id = crypto.randomUUID();
        await db.query("INSERT INTO inventory_sales SET ?", { id, ...saleData });
        return id;
    }

    async getStrategicReport(user) {
        const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        let params = [];
        let whereSales = "";
        let whereItems = "";

        if (normalizedRole !== 'superadmin') {
            if (user.school_id) {
                whereSales = "WHERE s.school_id = ?";
                whereItems = "WHERE i.school_id = ?";
                params = [user.school_id];
            } else {
                // Filter by garrison
                whereSales = "JOIN schools sch ON s.school_id = sch.id WHERE sch.garrison_id = ?";
                whereItems = "JOIN schools sch ON i.school_id = sch.id WHERE sch.garrison_id = ?";
                params = [user.garrison_id];
            }
        }

        // 1. Total Revenue from Sales
        const [revenue] = await db.query(`
            SELECT SUM(s.total_amount) as total FROM inventory_sales s ${whereSales}
        `, params);

        // 2. Category Performance
        const [categories] = await db.query(`
            SELECT i.category, SUM(s.total_amount) as amount, COUNT(s.id) as count
            FROM inventory_sales s
            JOIN inventory_items i ON s.item_id = i.id
            ${whereSales ? (user.school_id ? "WHERE s.school_id = ?" : "JOIN schools sch ON s.school_id = sch.id WHERE sch.garrison_id = ?") : ""}
            GROUP BY i.category
        `, params);

        // 3. Stock Value (Potential Revenue)
        const [stockValue] = await db.query(`
            SELECT SUM(i.stock_quantity * i.price) as value
            FROM inventory_items i
            ${whereItems}
        `, params);

        // 4. Sales over time (Last 30 days)
        const [timeline] = await db.query(`
            SELECT DATE(s.sale_date) as date, SUM(s.total_amount) as amount
            FROM inventory_sales s
            ${whereSales ? (user.school_id ? "WHERE s.school_id = ?" : "JOIN schools sch ON s.school_id = sch.id WHERE sch.garrison_id = ?") : ""}
            ${whereSales ? "AND" : "WHERE"} s.sale_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
            GROUP BY DATE(s.sale_date)
            ORDER BY date ASC
        `, params);

        return {
            total_revenue: parseFloat(revenue[0]?.total || 0),
            potential_revenue: parseFloat(stockValue[0]?.value || 0),
            category_breakdown: categories,
            timeline: timeline
        };
    }
}

module.exports = new InventoryService();
