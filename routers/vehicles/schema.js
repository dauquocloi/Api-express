const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		vehicleId: JoiObjectId().required(),
	}),
	getAll: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		status: Joi.number().valid(0, 1).optional(),
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
