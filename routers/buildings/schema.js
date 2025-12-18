const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const { buildingPermissions } = require('../../constants/buildings');
module.exports = {
	getAll: Joi.object().keys({
		userId: JoiObjectId().required(),
	}),
	id: Joi.object().keys({
		buildingId: JoiObjectId().required(),
	}),
	period: Joi.object().keys({
		month: Joi.string().optional(),
		year: Joi.string().optional(),
	}),
	editPermission: Joi.object().keys({
		type: Joi.valid(...Object.values(buildingPermissions)).required(),
		enabled: Joi.boolean().required(),
	}),
	getStatisticGeneral: Joi.object().keys({
		year: Joi.number().optional(),
	}),
};
