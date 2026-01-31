const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Fees = require('./fees');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const RESOURCE = 'fees';

const router = express.Router();

router.get('/initial', Fees.getFeeInitial);

//===================//
router.use(authentication);
//===================//

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.addFee, ValidateSource.BODY),

	Fees.addFee,
);

router.patch(
	'/:feeId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	checkIdempotency,
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.editFee, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Fees.editFee,
);

router.delete(
	'/:feeId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.deleteFee, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	Fees.deleteFee,
);

router.get(
	'/histories/:feeId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Fees.getFeeIndexHistory,
);

module.exports = router;
