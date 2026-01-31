const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Receipts = require('./receipts');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { checkIdempotency } = require('../../middleware/idempotency');
const RESOURCE = 'receipts';

const router = express.Router();
//======================//
router.use(authentication);
//======================//

router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAllReceipts, ValidateSource.QUERY),
	Receipts.getListReceiptPaymentStatus,
);

router.get(
	'/:receiptId',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Receipts.getReceiptDetail,
);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createReceipt, ValidateSource.BODY),
	checkIdempotency,
	Receipts.createReceipt,
);

router.post(
	'/deposit-receipt',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.createDepositReceipt, ValidateSource.BODY),
	Receipts.createDepositReceipt,
);

router.get(
	'/:receiptId/deposit',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Receipts.getDepositReceiptDetail,
);

router.patch(
	'/:receiptId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyReceipt, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Receipts.modifyReceipt,
);

router.post(
	'/:receiptId/collect-cash',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.collectCash, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Receipts.collectCashMoney,
);

router.post(
	'/:receiptId/checkout',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.checkout, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),

	Receipts.checkout,
);

router.delete(
	'/:receiptId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.deleteReceipt, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Receipts.deleteReceipt,
);
router.post(
	'/debt-receipt',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.createReceipt, ValidateSource.BODY),
	Receipts.createDebtsReceipt,
);

module.exports = router;
