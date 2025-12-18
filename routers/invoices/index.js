const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Invoices = require('./invoices');
const authentication = require('../../auth/authentication');

const router = express.Router();

// router.use(authentication);
router.get('/', validator(schema.getAllInvoices, ValidateSource.QUERY), Invoices.getInvoicesPaymentStatus);
router.get('/:invoiceId', validator(schema.id, ValidateSource.PARAM), Invoices.getInvoiceDetail);
router.get('/sending-status', validator(schema.getAllInvoices, ValidateSource.QUERY), Invoices.getInvoiceSendingStatus);
router.patch('/:invoiceId', validator(schema.id, ValidateSource.PARAM), validator(schema.modifyInvoice, ValidateSource.BODY), Invoices.modifyInvoice);
router.delete('/:invoiceId', validator(schema.id, ValidateSource.PARAM), Invoices.deleteInvoice);
router.post('/:invoiceId/collect-cash', validator(schema.id, ValidateSource.PARAM), Invoices.collectCashMoney);
router.post('/create', validator(schema.createInvoice, ValidateSource.BODY), Invoices.createInvoice);
router.delete('/:invoiceId/debts', validator(schema.id, ValidateSource.PARAM), Invoices.deleteDebts);

module.exports = router;
