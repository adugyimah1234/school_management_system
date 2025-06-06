const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice');

// Middleware for authentication (adjust as needed)
// const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
// router.use(authenticate);

/**
 * @route GET /api/invoices
 * @desc Get all invoices with optional filters
 * @access Private
 */
router.get('/', invoiceController.getInvoices);

/**
 * @route GET /api/invoices/summary
 * @desc Get invoices summary statistics
 * @access Private
 */
router.get('/summary', invoiceController.getInvoicesSummary);

/**
 * @route GET /api/invoices/:id
 * @desc Get a single invoice by ID
 * @access Private
 */
router.get('/:id', invoiceController.getInvoice);

/**
 * @route POST /api/invoices
 * @desc Create a new invoice
 * @access Private
 */
router.post('/', invoiceController.createInvoice);

/**
 * @route PUT /api/invoices/:id
 * @desc Update an existing invoice
 * @access Private
 */
router.put('/:id', invoiceController.updateInvoice);

/**
 * @route DELETE /api/invoices/:id
 * @desc Delete an invoice
 * @access Private
 */
router.delete('/:id', invoiceController.deleteInvoice);

/**
 * @route PUT /api/invoices/:id/mark-sent
 * @desc Mark an invoice as sent
 * @access Private
 */
router.put('/:id/mark-sent', invoiceController.markInvoiceAsSent);

/**
 * @route PUT /api/invoices/:id/mark-paid
 * @desc Mark an invoice as paid
 * @access Private
 */
router.put('/:id/mark-paid', invoiceController.markInvoiceAsPaid);

/**
 * @route PUT /api/invoices/:id/cancel
 * @desc Cancel an invoice
 * @access Private
 */
router.put('/:id/cancel', invoiceController.cancelInvoice);

/**
 * @route POST /api/invoices/:id/send-email
 * @desc Send invoice by email
 * @access Private
 */
router.post('/:id/send-email', invoiceController.sendInvoiceByEmail);

/**
 * @route GET /api/invoices/:id/pdf
 * @desc Get invoice PDF
 * @access Private
 */
router.get('/:id/pdf', invoiceController.getInvoicePdf);

module.exports = router;