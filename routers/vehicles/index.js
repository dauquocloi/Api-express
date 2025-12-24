const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Vehicles = require('./vehicles');
const authentication = require('../../auth/authentication');
const authorization = require('../../auth/authorization');
const ROLES = require('../../constants/userRoles');

const router = express.Router();

router.use(authentication);
router.get('/', validator(schema.getAll, ValidateSource.QUERY), Vehicles.getAll);
router.post('/', validator(schema.create, ValidateSource.BODY), Vehicles.addVehicle);
router.get('/:vehicleId', validator(schema.id, ValidateSource.PARAM), Vehicles.getVehicle);
router.patch(
	'/:vehicleId',
	authorization(ROLES['OWNER'], ROLES['MANAGER']),
	validator(schema.id, ValidateSource.PARAM),
	validator(schema.modifyVehicle, ValidateSource.BODY),
	Vehicles.editVehicle,
);

module.exports = router;
