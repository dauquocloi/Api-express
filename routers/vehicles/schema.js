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
		roomId: JoiObjectId().required(),
		licensePlate: Joi.string().required(),
		fromDate: Joi.date().required(),
	}),
	modifyVehicle: Joi.object().keys({
		licensePlate: Joi.string().required(),
		fromDate: Joi.date().required(),
	}),
};
