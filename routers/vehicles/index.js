const express = require('express');
const { validator, ValidateSource } = require('../../utils/validator');
const schema = require('./schema');
const Vehicles = require('./vehicles');
const authentication = require('../../auth/authentication');

const router = express.Router();

// router.use(authentication);
router.get('/', validator(schema.getAll, ValidateSource.QUERY), Vehicles.getAll);
router.post('/', validator(schema.create, ValidateSource.BODY), Vehicles.addVehicle);
router.get('/:vehicleId', validator(schema.id, ValidateSource.PARAM), Vehicles.getVehicle);
router.patch('/:vehicleId', validator(schema.id, ValidateSource.PARAM), validator(schema.modifyVehicle, ValidateSource.BODY), Vehicles.editVehicle);

module.exports = router;
