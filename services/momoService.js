const db = require("../config/db");
const crypto = require("crypto");
const logger = require("../utils/logger");
const financialService = require("./financialService");

class MomoService {
    async reconcile(transactions, user) {
        let results = {
            matched: 0,
            already_recorded: 0,
            failed: 0,
            details: []
        };

        for (const tx of transactions) {
            try {
                const { external_ref, amount, sender_info, date } = tx;

                // 1. Check if reference already exists
                const [existing] = await db.query("SELECT id FROM payments WHERE transaction_reference = ?", [external_ref]);
                if (existing.length > 0) {
                    results.already_recorded++;
                    results.details.push({ ref: external_ref, status: 'already_recorded', msg: 'Transaction already exists' });
                    continue;
                }

                // 2. Identify Student (Searching by ID or Name in sender_info)
                // We'll search for 8-char codes or names
                let student = null;

                // Try searching for student ID match in sender_info/description
                const idMatch = sender_info.match(/[A-Z0-9]{8}/i);
                if (idMatch) {
                    const [rows] = await db.query("SELECT * FROM students WHERE id LIKE ?", [`%${idMatch[0]}%`]);
                    if (rows.length === 1) student = rows[0];
                }

                // If not found by ID, try name matching (simple)
                if (!student) {
                    const [rows] = await db.query(`
                        SELECT * FROM students
                        WHERE ? LIKE CONCAT('%', first_name, '%') AND ? LIKE CONCAT('%', last_name, '%')
                        AND school_id = ?
                    `, [sender_info, sender_info, user.school_id]);
                    if (rows.length === 1) student = rows[0];
                }

                if (student) {
                    // 3. Record Payment
                    // Find any outstanding fee for this student
                    const fees = await financialService.getStudentFinancialSummary(student.id);
                    const pendingFee = fees.find(f => f.balance > 0);

                    if (pendingFee) {
                        const amountToPay = Math.min(amount, pendingFee.balance);
                        await db.query(`
                            INSERT INTO payments (id, student_id, fee_id, school_id, garrison_id, amount_paid, payment_date, method, transaction_reference, recorded_by, description)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            crypto.randomUUID(),
                            student.id,
                            pendingFee.id,
                            user.school_id,
                            user.garrison_id,
                            amountToPay,
                            date || new Date(),
                            'momo',
                            external_ref,
                            user.id,
                            `Reconciled from MoMo Statement: ${sender_info}`
                        ]);

                        results.matched++;
                        results.details.push({ ref: external_ref, student: `${student.first_name} ${student.last_name}`, status: 'matched', amount: amountToPay });

                        // 4. Trigger SMS Auto-Receipt
                        try {
                            const commService = require('./communicationService');
                            const smsMsg = `GARRISON SMS: MoMo Payment Verified. Student: ${student.first_name} ${student.last_name}. Amount: GHS ${amountToPay.toFixed(2)}. Ref: ${external_ref}. Your student account has been updated.`;
                            await commService.sendSMS(student.guardian_phone_number, smsMsg);
                        } catch (smsErr) {
                            logger.error("Auto-Receipt SMS Error: " + smsErr.message);
                        }
                    } else {
                        results.failed++;
                        results.details.push({ ref: external_ref, status: 'no_pending_fee', msg: 'No outstanding balance found for student' });
                    }
                } else {
                    results.failed++;
                    results.details.push({ ref: external_ref, status: 'unidentified', msg: 'Could not identify student from reference' });
                }
            } catch (err) {
                logger.error("Reconciliation Item Error: " + err.message);
                results.failed++;
            }
        }

        return results;
    }
}

module.exports = new MomoService();
