const inventoryService = require("../services/inventoryService");
const response = require("../utils/apiResponse");

exports.getAllItems = async (req, res, next) => {
    try {
        const items = await inventoryService.getAllItems(req.user);
        return response.success(res, items);
    } catch (err) {
        next(err);
    }
};

exports.createItem = async (req, res, next) => {
    try {
        const item = await inventoryService.createItem(req.body, req.user);
        return response.success(res, item, "Item added to inventory", 201);
    } catch (err) {
        next(err);
    }
};

exports.updateItem = async (req, res, next) => {
    try {
        await inventoryService.updateItem(req.params.id, req.body);
        return response.success(res, null, "Inventory item updated");
    } catch (err) {
        next(err);
    }
};

exports.deleteItem = async (req, res, next) => {
    try {
        await inventoryService.deleteItem(req.params.id);
        return response.success(res, null, "Item removed from inventory");
    } catch (err) {
        next(err);
    }
};

exports.recordSale = async (req, res, next) => {
    try {
        const { items, student_id, payment_method } = req.body;
        const db = require('../config/db');
        const crypto = require('crypto');

        if (!Array.isArray(items)) return res.status(400).json({ error: "Invalid items" });

        const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        // 1. Process each item
        for (const item of items) {
            // Adjust Stock
            await inventoryService.adjustStock(item.id, -item.quantity);

            // Record Sale History
            await inventoryService.recordSaleRecord({
                item_id: item.id,
                school_id: req.user.school_id,
                garrison_id: req.user.garrison_id,
                student_id: student_id || null,
                quantity: item.quantity,
                unit_price: item.price,
                total_amount: item.price * item.quantity,
                payment_method: payment_method || 'cash',
                sold_by: req.user.id
            });
        }

        // 2. If 'debt', link to student account
        if (payment_method === 'debt' && student_id) {
            const [categories] = await db.query("SELECT id FROM categories WHERE name = 'Other' OR code = 'GEN' LIMIT 1");
            const categoryId = categories[0]?.id;
            const [[student]] = await db.query("SELECT class_id FROM students WHERE id = ?", [student_id]);

            const feeId = crypto.randomUUID();
            await db.query(`
                INSERT INTO fees (id, category_id, class_id, school_id, garrison_id, fee_type, amount, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                feeId,
                categoryId,
                student?.class_id,
                req.user.school_id,
                req.user.garrison_id,
                'provision',
                totalAmount,
                `Provisions Store Credit: ${items.map(i => i.name).join(', ')}`
            ]);
        }

        // 3. Trigger SMS Auto-Receipt
        if (student_id) {
            try {
                const [[student]] = await db.query("SELECT first_name, last_name, guardian_phone_number FROM students WHERE id = ?", [student_id]);
                if (student && student.guardian_phone_number) {
                    const commService = require('../services/communicationService');
                    const paymentType = payment_method === 'debt' ? 'charged to account' : 'paid via cash/momo';
                    const smsMsg = `GARRISON STORE: Sale finalized for ${student.first_name} ${student.last_name}. Items: ${items.map(i => i.name).join(', ')}. Total: GHS ${totalAmount.toFixed(2)} (${paymentType}). Thank you.`;
                    await commService.sendSMS(student.guardian_phone_number, smsMsg);
                }
            } catch (smsErr) {
                console.error("Store Auto-Receipt SMS Error:", smsErr.message);
            }
        }

        return response.success(res, null, "Inventory synchronized with sale");
    } catch (err) {
        next(err);
    }
};

exports.getInventoryReport = async (req, res, next) => {
    try {
        const report = await inventoryService.getStrategicReport(req.user);
        return response.success(res, report);
    } catch (err) {
        next(err);
    }
};
