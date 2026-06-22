const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Fees = require('./fees');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const { RESOURCES, VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');
const { PERMISSIONS } = require('../../constants/permissions');

const router = express.Router();

router.get('/initial', Fees.getFeeInitial);

//===================//
router.use(authentication);
//===================//

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.addFee, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['rooms'], PERMISSIONS['EDIT_FEE'], RESOURCE_VS['BODY']),
	checkIdempotency,

	Fees.addFee,
);

router.patch(
	'/:feeId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.editFee, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['fees'], PERMISSIONS['EDIT_FEE']),
	checkIdempotency,
	Fees.editFee,
);

router.delete(
	'/:feeId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['fees'], PERMISSIONS['EDIT_FEE']),
	Fees.deleteFee,
);

router.get(
	'/histories/:feeId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['fees']),
	Fees.getFeeIndexHistory,
);

module.exports = router;
