const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Invoices = require('./invoices');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { buildingPermissions: POLICY } = require('../../constants/buildings');
const { checkIdempotency } = require('../../middleware/idempotency');

const RESOURCE = 'invoices';
const router = express.Router();

//====================//
router.use(authentication);
//====================//

router.get('/', validator(schema.getAllInvoices, ValidateSource.QUERY), Invoices.getInvoicesPaymentStatus);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createInvoice, ValidateSource.BODY),
	checkIdempotency,
	Invoices.createInvoice,
);

router.get(
	'/sending-status',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.getAllInvoices, ValidateSource.QUERY),
	checkResourceAccess(RESOURCE),
	Invoices.getInvoiceSendingStatus,
);

router.get(
	'/:invoiceId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Invoices.getInvoiceDetail,
);

router.patch(
	'/:invoiceId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyInvoice, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Invoices.modifyInvoice,
);

router.delete(
	'/:invoiceId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.deleteInvoice, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Invoices.deleteInvoice,
);

router.post(
	'/:invoiceId/collect-cash',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.collectCash, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Invoices.collectCashMoney,
);

router.post(
	'/:invoiceId/checkout',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.checkout, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Invoices.checkout,
);

router.delete(
	'/:invoiceId/debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Invoices.deleteDebts,
);

module.exports = router;
