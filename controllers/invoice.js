const { Invoice, InvoiceItem, PaymentHistory } = require('../models/invoice');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

class InvoiceController {
  
  /**
   * Get all invoices with optional filters
   */
  async getInvoices(req, res) {
    try {
      const {
        student_id,
        status,
        school_id,
        class_id,
        issue_date_from,
        issue_date_to,
        due_date_from,
        due_date_to,
        search,
        page = 1,
        limit = 50
      } = req.query;

      const whereClause = {};
      const offset = (page - 1) * limit;

      // Apply filters
      if (student_id) whereClause.student_id = student_id;
      if (school_id) whereClause.school_id = school_id;
      if (class_id) whereClause.class_id = class_id;

      // Handle status filter (can be array)
      if (status) {
        if (Array.isArray(status)) {
          whereClause.status = { [Op.in]: status };
        } else {
          whereClause.status = status;
        }
      }

      // Date range filters
      if (issue_date_from || issue_date_to) {
        whereClause.issue_date = {};
        if (issue_date_from) whereClause.issue_date[Op.gte] = issue_date_from;
        if (issue_date_to) whereClause.issue_date[Op.lte] = issue_date_to;
      }

      if (due_date_from || due_date_to) {
        whereClause.due_date = {};
        if (due_date_from) whereClause.due_date[Op.gte] = due_date_from;
        if (due_date_to) whereClause.due_date[Op.lte] = due_date_to;
      }

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { invoice_number: { [Op.like]: `%${search}%` } },
          { notes: { [Op.like]: `%${search}%` } }
        ];
      }

      const invoices = await Invoice.findAndCountAll({
        where: whereClause,
        include: [
          {
            association: 'items',
            include: [
              {
                association: 'fee', // Assuming you have this association
                attributes: ['id', 'fee_type', 'description']
              }
            ]
          }
        ],
        order: [['created_at', 'DESC']],
        offset: parseInt(offset),
        limit: parseInt(limit)
      });

      res.json({
        invoices: invoices.rows,
        total: invoices.count,
        page: parseInt(page),
        pages: Math.ceil(invoices.count / limit)
      });

    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  }

  /**
   * Get a single invoice with full details
   */
  async getInvoice(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findByPk(id, {
        include: [
          {
            association: 'items',
            include: [
              {
                association: 'fee', // Assuming you have this association
                attributes: ['id', 'fee_type', 'description', 'amount']
              }
            ]
          },
          {
            association: 'payment_history',
            order: [['date', 'DESC']]
          }
          // Add other associations as needed:
          // { association: 'student', attributes: ['id', 'name', 'email', 'admission_number'] },
          // { association: 'school', attributes: ['id', 'name'] },
          // { association: 'class', attributes: ['id', 'name'] },
          // { association: 'creator', attributes: ['id', 'name'] }
        ]
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.json(invoice);

    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  }

  /**
   * Create a new invoice
   */
  async createInvoice(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        student_id,
        issue_date,
        due_date,
        items,
        notes,
        school_id,
        class_id
      } = req.body;

      // Validate required fields
      if (!student_id || !issue_date || !due_date || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Calculate total amount
      const total_amount = items.reduce((sum, item) => {
        return sum + (item.amount * item.quantity);
      }, 0);

      // Create invoice
      const invoice = await Invoice.create({
        student_id,
        issue_date,
        due_date,
        total_amount,
        notes,
        school_id,
        class_id,
        created_by: req.user?.id // Assuming you have user from auth middleware
      }, { transaction });

      // Create invoice items
      const invoiceItems = await Promise.all(
        items.map(item => 
          InvoiceItem.create({
            invoice_id: invoice.id,
            fee_id: item.fee_id,
            description: item.description,
            amount: item.amount,
            quantity: item.quantity
          }, { transaction })
        )
      );

      await transaction.commit();

      // Fetch the created invoice with all details
      const createdInvoice = await Invoice.findByPk(invoice.id, {
        include: [
          { association: 'items' },
          { association: 'payment_history' }
        ]
      });

      res.status(201).json(createdInvoice);

    } catch (error) {
      await transaction.rollback();
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  }

  /**
   * Update an existing invoice
   */
  async updateInvoice(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const {
        student_id,
        issue_date,
        due_date,
        status,
        notes,
        school_id,
        class_id,
        items
      } = req.body;

      const invoice = await Invoice.findByPk(id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Update invoice fields
      const updateData = {};
      if (student_id !== undefined) updateData.student_id = student_id;
      if (issue_date !== undefined) updateData.issue_date = issue_date;
      if (due_date !== undefined) updateData.due_date = due_date;
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (school_id !== undefined) updateData.school_id = school_id;
      if (class_id !== undefined) updateData.class_id = class_id;

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await InvoiceItem.destroy({
          where: { invoice_id: id },
          transaction
        });

        // Create new items
        await Promise.all(
          items.map(item => 
            InvoiceItem.create({
              invoice_id: id,
              fee_id: item.fee_id,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity
            }, { transaction })
          )
        );

        // Recalculate total amount
        updateData.total_amount = items.reduce((sum, item) => {
          return sum + (item.amount * item.quantity);
        }, 0);
      }

      await invoice.update(updateData, { transaction });
      await transaction.commit();

      // Fetch updated invoice with details
      const updatedInvoice = await Invoice.findByPk(id, {
        include: [
          { association: 'items' },
          { association: 'payment_history' }
        ]
      });

      res.json(updatedInvoice);

    } catch (error) {
      await transaction.rollback();
      console.error('Error updating invoice:', error);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  }

  /**
   * Delete an invoice
   */
  async deleteInvoice(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;

      const invoice = await Invoice.findByPk(id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check if invoice can be deleted (e.g., not paid)
      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Cannot delete paid invoice' });
      }

      await invoice.destroy({ transaction });
      await transaction.commit();

      res.json({ message: 'Invoice deleted successfully' });

    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting invoice:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  }

  /**
   * Mark invoice as sent
   */
  async markInvoiceAsSent(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findByPk(id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      await invoice.update({ status: 'sent' });

      const updatedInvoice = await Invoice.findByPk(id, {
        include: [
          { association: 'items' },
          { association: 'payment_history' }
        ]
      });

      res.json(updatedInvoice);

    } catch (error) {
      console.error('Error marking invoice as sent:', error);
      res.status(500).json({ error: 'Failed to mark invoice as sent' });
    }
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { amount, payment_date, payment_method, notes } = req.body;

      const invoice = await Invoice.findByPk(id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Validate payment amount
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid payment amount' });
      }

      const newAmountPaid = parseFloat(invoice.amount_paid) + parseFloat(amount);
      
      if (newAmountPaid > parseFloat(invoice.total_amount)) {
        return res.status(400).json({ error: 'Payment amount exceeds invoice total' });
      }

      // Create payment history record
      await PaymentHistory.create({
        invoice_id: id,
        amount,
        date: payment_date || new Date(),
        method: payment_method,
        notes
      }, { transaction });

      // Update invoice
      await invoice.update({
        amount_paid: newAmountPaid,
        status: newAmountPaid >= parseFloat(invoice.total_amount) ? 'paid' : 'partially_paid'
      }, { transaction });

      await transaction.commit();

      const updatedInvoice = await Invoice.findByPk(id, {
        include: [
          { association: 'items' },
          { association: 'payment_history' }
        ]
      });

      res.json(updatedInvoice);

    } catch (error) {
      await transaction.rollback();
      console.error('Error marking invoice as paid:', error);
      res.status(500).json({ error: 'Failed to mark invoice as paid' });
    }
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const invoice = await Invoice.findByPk(id);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Cannot cancel paid invoice' });
      }

      await invoice.update({ 
        status: 'cancelled',
        notes: reason ? `${invoice.notes || ''}\nCancellation reason: ${reason}` : invoice.notes
      });

      const updatedInvoice = await Invoice.findByPk(id, {
        include: [
          { association: 'items' },
          { association: 'payment_history' }
        ]
      });

      res.json(updatedInvoice);

    } catch (error) {
      console.error('Error cancelling invoice:', error);
      res.status(500).json({ error: 'Failed to cancel invoice' });
    }
  }

  /**
   * Send invoice by email
   */
  async sendInvoiceByEmail(req, res) {
    try {
      const { id } = req.params;
      const { to, cc, message } = req.body;

      const invoice = await Invoice.findByPk(id, {
        include: [
          { association: 'items' }
          // Add student association to get email
        ]
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // TODO: Implement email sending logic here
      // This would typically involve:
      // 1. Generate PDF invoice
      // 2. Send email with PDF attachment
      // 3. Update invoice status to 'sent'

      // For now, just mark as sent
      await invoice.update({ status: 'sent' });

      res.json({ message: 'Invoice sent successfully' });

    } catch (error) {
      console.error('Error sending invoice email:', error);
      res.status(500).json({ error: 'Failed to send invoice email' });
    }
  }

  /**
   * Get invoice PDF
   */
  async getInvoicePdf(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findByPk(id, {
        include: [
          { association: 'items' }
          // Add other associations as needed
        ]
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // TODO: Implement PDF generation logic here
      // This would typically involve using a library like puppeteer or pdfkit
      // to generate a PDF from the invoice data

      res.json({ message: 'PDF generation not implemented yet' });

    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
  }

  /**
   * Get invoices summary
   */
  async getInvoicesSummary(req, res) {
    try {
      const { school_id } = req.query;
      const whereClause = {};
      
      if (school_id) {
        whereClause.school_id = school_id;
      }

      const summary = await Invoice.findAll({
        where: whereClause,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'draft' THEN 1 ELSE 0 END")), 'draft'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'sent' THEN 1 ELSE 0 END")), 'sent'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'paid' THEN 1 ELSE 0 END")), 'paid'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'overdue' THEN 1 ELSE 0 END")), 'overdue'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'partially_paid' THEN 1 ELSE 0 END")), 'partially_paid'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_amount'],
          [sequelize.fn('SUM', sequelize.col('amount_paid')), 'total_paid'],
          [sequelize.fn('SUM', sequelize.col('balance')), 'total_balance']
        ],
        raw: true
      });

      const result = summary[0] || {};
      
      // Convert string numbers to actual numbers
      Object.keys(result).forEach(key => {
        if (result[key] !== null) {
          result[key] = parseFloat(result[key]) || 0;
        } else {
          result[key] = 0;
        }
      });

      res.json(result);

    } catch (error) {
      console.error('Error fetching invoices summary:', error);
      res.status(500).json({ error: 'Failed to fetch invoices summary' });
    }
  }
}

module.exports = new InvoiceController();