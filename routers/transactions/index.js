const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Transactions = require('./transactions');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const checkResourceAccess = require('../../auth/checkResourceAccess');

const RESOURCE = 'transactions';
const router = express.Router();

router.use(authentication);

router.patch(
	'/:transactionId/confirmation',
	authorization(ROLES['OWNER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Transactions.confirmTransaction,
);

router.patch(
	'/:transactionId/decline',
	authorization(ROLES['OWNER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.declineTransaction, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Transactions.declineTransaction,
);

router.patch(
	'/:transactionId/receive-cash-from-manager',
	authorization(ROLES['OWNER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Transactions.receiveCashFromManager,
);

module.exports = router;
