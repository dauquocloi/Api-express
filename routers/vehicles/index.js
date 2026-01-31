const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Vehicles = require('./vehicles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { checkIdempotency } = require('../../middleware/idempotency');
const RESOURCE = 'vehicles';

const router = express.Router();

router.use(authentication);

router.get('/', authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']), validator(schema.getAll, ValidateSource.QUERY), Vehicles.getAll);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.create, ValidateSource.BODY),
	checkIdempotency,
	Vehicles.addVehicle,
);

router.get(
	'/:vehicleId',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCE),
	Vehicles.getVehicle,
);

router.patch(
	'/:vehicleId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyVehicle, ValidateSource.BODY),
	checkResourceAccess(RESOURCE),
	checkIdempotency,
	Vehicles.editVehicle,
);

module.exports = router;
