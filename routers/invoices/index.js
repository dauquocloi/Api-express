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
const { RESOURCES, VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');
const router = express.Router();

//====================//
router.use(authentication);
//====================//

router.get(
	'/',
	validator(schema.getAllInvoices, ValidateSource.QUERY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['QUERY']),
	Invoices.getInvoicesPaymentStatus,
);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createInvoice, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['BODY']),
	checkIdempotency,
	Invoices.createInvoice,
);

router.get(
	'/sending-status',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.getInvoiceSendingStatus, ValidateSource.QUERY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['QUERY']),
	Invoices.getInvoiceSendingStatus,
);

router.get(
	'/:invoiceId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['invoices']),
	Invoices.getInvoiceDetail,
);

router.patch(
	'/:invoiceId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyInvoice, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['invoices'], POLICY['MANAGER_EDIT_INVOICE']),
	checkIdempotency,
	Invoices.modifyInvoice,
);

router.delete(
	'/:invoiceId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.deleteInvoice, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['invoices'], POLICY['MANAGER_DELETE_INVOICE']),
	Invoices.deleteInvoice,
);

router.post(
	'/:invoiceId/collect-cash',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.collectCash, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['invoices']),
	checkIdempotency,
	Invoices.collectCashMoney,
);

router.post(
	'/:invoiceId/checkout',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.checkout, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['invoices'], POLICY['MANAGER_COLLECT_CASH']),
	checkIdempotency,
	Invoices.checkout,
);

router.delete(
	'/:invoiceId/debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['invoices']),
	Invoices.deleteDebts,
);

module.exports = router;
