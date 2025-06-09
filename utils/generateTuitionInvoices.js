// services/generateTuitionInvoices.js
const { Invoice, InvoiceItem } = require('../models/invoice');
const { Student } = require('../models/studentModel'); // Adjust path as needed
const { Op } = require('sequelize');
const { TUITION_FEE_ID, TuitionByCategory } = require('../config/tuitionConfig');

async function generateTuitionInvoices(adminId) {
  const students = await Student.findAll({ where: { admission_status: 'admitted' } });
  const today = new Date().toISOString().split('T')[0];

  for (const student of students) {
    const tuition = TuitionByCategory[student.category_id];
    if (!tuition) {
      console.warn(`No tuition config for category_id ${student.category_id}`);
      continue;
    }

    // Cancel previous tuition invoices (not paid)
    await Invoice.update(
      {
        status: 'cancelled',
        notes: 'Auto-cancelled by bulk tuition generation'
      },
      {
        where: {
          student_id: student.id,
          status: { [Op.not]: 'paid' },
          '$items.fee_id$': TUITION_FEE_ID
        },
        include: [{ association: 'items' }]
      }
    );

    // Create new invoice
    const invoice = await Invoice.create({
      student_id: student.id,
      issue_date: today,
      due_date: today,
      total_amount: tuition.amount,
      notes: `Tuition for ${tuition.label}`,
      school_id: student.school_id,
      class_id: student.class_id,
      status: 'sent',
      created_by: adminId
    });

    await InvoiceItem.create({
      invoice_id: invoice.id,
      fee_id: TUITION_FEE_ID,
      description: `Tuition Fee - ${tuition.label}`,
      amount: tuition.amount,
      quantity: 1
    });

    console.log(`✅ Invoice created for ${student.first_name}`);
  }
}

module.exports = generateTuitionInvoices;
module.exports = generateTuitionInvoices;
module.exports = generateTuitionInvoices;