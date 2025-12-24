const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Invoices = require('./invoices');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { buildingPermissions: POLICY } = require('../../constants/buildings');

const RESOURCE = 'invoices';
const router = express.Router();

router.use(authentication);

router.get('/', validator(schema.getAllInvoices, ValidateSource.QUERY), Invoices.getInvoicesPaymentStatus);
router.post('/', validator(schema.createInvoice, ValidateSource.BODY), Invoices.createInvoice);
router.get('/sending-status', validator(schema.getAllInvoices, ValidateSource.QUERY), Invoices.getInvoiceSendingStatus);
router.get('/:invoiceId', validator(schema.id, ValidateSource.PARAM), Invoices.getInvoiceDetail);

router.patch('/:invoiceId', validator(schema.id, ValidateSource.PARAM), validator(schema.modifyInvoice, ValidateSource.BODY), Invoices.modifyInvoice);
router.delete(
	'/:invoiceId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	// checkResourceAccess(RESOURCE, POLICY['MANAGER_DELETE_INVOICE']),
	validator(schema.deleteInvoice, ValidateSource.BODY),
	Invoices.deleteInvoice,
);

router.post('/:invoiceId/collect-cash', validator(schema.id, ValidateSource.PARAM), Invoices.collectCashMoney);
router.delete('/:invoiceId/debts', validator(schema.id, ValidateSource.PARAM), Invoices.deleteDebts);

module.exports = router;
