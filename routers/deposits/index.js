const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Deposits = require('./deposits');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const RESOURCE = 'deposits';

const router = express.Router();

router.use(authentication);

router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAllDeposits, ValidateSource.QUERY),
	Deposits.getDeposits,
);

router.get(
	'/:depositId',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Deposits.getDepositDetail,
);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.createDeposit, ValidateSource.BODY),
	Deposits.createDeposit,
);

router.patch(
	'/:depositId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyDeposit, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Deposits.modifyDeposit,
);

router.delete(
	'/:depositId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Deposits.terminateDeposit,
);

//piece of shit
router.post(
	'/:depositId/deposit-term',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	Deposits.uploardDepositTerm,
);

module.exports = router;
