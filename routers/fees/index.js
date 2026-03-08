const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Fees = require('./fees');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const { buildingPermissions: POLICY } = require('../../constants/buildings');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const ROLES = require('../../constants/userRoles');
const { checkIdempotency } = require('../../middleware/idempotency');
const { RESOURCES, VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');

const router = express.Router();

router.get('/initial', Fees.getFeeInitial);

//===================//
router.use(authentication);
//===================//

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.addFee, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['rooms'], POLICY['MANAGER_EDIT_ROOM_FEE'], RESOURCE_VS['BODY']),
	checkIdempotency,

	Fees.addFee,
);

router.patch(
	'/:feeId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.editFee, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['fees'], POLICY['MANAGER_EDIT_ROOM_FEE']),
	checkIdempotency,
	Fees.editFee,
);

router.delete(
	'/:feeId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['fees'], POLICY['MANAGER_EDIT_ROOM_FEE']),
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
