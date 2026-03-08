const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const { vehicleStatus } = require('../../constants/vehicle');
module.exports = {
	id: Joi.object().keys({
		vehicleId: JoiObjectId().required(),
	}),
	getAll: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		status: Joi.string()
			.valid(...Object.values(vehicleStatus))
			.optional(),
	}),
	createVehicle: Joi.object().keys({
		customerId: JoiObjectId().required(),
		licensePlate: Joi.string().required(),
		fromDate: Joi.date().required(),
		image: Joi.string().allow('', null).optional(),
	}),
	modifyVehicle: Joi.object().keys({
		licensePlate: Joi.string().required(),
		fromDate: Joi.date().required(),
		status: Joi.string()
			.valid(...Object.values(vehicleStatus))
			.required(),
		image: Joi.string().allow('', null).optional(),
	}),
};
