const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Receipts = require('./receipts');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { checkIdempotency } = require('../../middleware/idempotency');
const { RESOURCES, VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');
const { buildingPermissions: POLICY } = require('../../constants/buildings');

const router = express.Router();
//======================//
router.use(authentication);
//======================//

router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAllReceipts, ValidateSource.QUERY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['QUERY']),
	Receipts.getListReceiptPaymentStatus,
);

router.get(
	'/:receiptId',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['receipts']),
	Receipts.getReceiptDetail,
);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createReceipt, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['rooms'], null, RESOURCE_VS['BODY']),
	checkIdempotency,
	Receipts.createReceipt,
);

router.post(
	'/deposit-receipt',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createDepositReceipt, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['BODY']),
	checkIdempotency,
	Receipts.createDepositReceipt,
);

router.get(
	'/:receiptId/deposit',
	authorization(ROLES['MANAGER'], ROLES['OWNER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['receipts']),
	Receipts.getDepositReceiptDetail,
);

router.patch(
	'/:receiptId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyReceipt, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['receipts'], POLICY['MANAGER_EDIT_INVOICE']),
	checkIdempotency,
	Receipts.modifyReceipt,
);

//NOT USED
router.post(
	'/:receiptId/collect-cash',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.collectCash, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['receipts']),
	Receipts.collectCashMoney,
);

router.post(
	'/:receiptId/checkout',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.checkout, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['receipts'], POLICY['MANAGER_COLLECT_CASH']),
	checkIdempotency,
	Receipts.checkout,
);

router.delete(
	'/:receiptId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.deleteReceipt, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['receipts'], POLICY['MANAGER_DELETE_INVOICE']),
	Receipts.deleteReceipt,
);
router.post(
	'/debt-receipt',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.createReceipt, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['BODY']),
	checkIdempotency,
	Receipts.createDebtsReceipt,
);

module.exports = router;
