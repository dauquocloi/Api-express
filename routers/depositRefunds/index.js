const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const DepositRefunds = require('./depositRefunds');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const router = express.Router();
const { checkIdempotency } = require('../../middleware/idempotency');
const RESOURCE = 'depositRefunds';

//================//
router.use(authentication);
//================//

router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAllDepositRefunds, ValidateSource.QUERY),
	DepositRefunds.getDepositRefunds,
);

router.get(
	'/:depositRefundId',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	DepositRefunds.getDepositRefundDetail,
);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.createDepositRefund, ValidateSource.BODY),
	DepositRefunds.generateDepositRefund,
);

router.post(
	'/:depositRefundId/confirm',
	authorization(ROLES['OWNER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	DepositRefunds.confirmDepositRefund,
);

router.patch(
	'/:depositRefundId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	DepositRefunds.modifyDepositRefund,
);

// router.patch('/:depositRefundId/workflow/on-editting'); // Role này để mở các hóa đơn chưa chưa thanh toán đã bị khóa

router.delete(
	'/:depositRefundId/debts',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	DepositRefunds.removeDebtsFromDepositRefund,
);

router.get(
	'/:depositRefundId/modify-info',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	DepositRefunds.getModifyDepositRefundInfo,
);

module.exports = router;
