const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Vehicles = require('./vehicles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');
const checkResourceAccess = require('../../auth/checkResourceAccess');
const { checkIdempotency } = require('../../middleware/idempotency');
const { RESOURCES, VALIDATE_SOURCE: RESOURCE_VS } = require('../../constants/resources');
const upload = require('../../middleware/multer');

const router = express.Router();

router.use(authentication);

router.get(
	'/',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.getAll, ValidateSource.QUERY),
	checkResourceAccess(RESOURCES['buildings'], null, RESOURCE_VS['QUERY']),
	Vehicles.getAll,
);

router.post(
	'/',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	upload.single('image'),
	validator(schema.createVehicle, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['customers'], null, RESOURCE_VS['BODY']),
	checkIdempotency,
	Vehicles.addVehicle,
);

router.get(
	'/:vehicleId',
	authorization(ROLES['MANAGER'], ROLES['OWNER'], ROLES['STAFF']),
	validator(schema.id, ValidateSource.PARAM),
	checkResourceAccess(RESOURCES['vehicles']),
	Vehicles.getVehicle,
);

router.patch(
	'/:vehicleId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	upload.single('image'),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyVehicle, ValidateSource.BODY),
	checkResourceAccess(RESOURCES['vehicles']),
	Vehicles.editVehicle,
);

module.exports = router;
