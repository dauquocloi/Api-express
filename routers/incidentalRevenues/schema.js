const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		incidentalRevenueId: Joi.string().required(),
	}),
	createIncidentalRevenue: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		amount: Joi.number().required(),
		content: Joi.string().required(),
		date: Joi.date().optional(),
		image: Joi.string().optional(),
		collector: JoiObjectId().optional(),
	}),
	modifyIncidentalRevenue: Joi.object().keys({
		amount: Joi.number().required(),
		content: Joi.string().required(),
		date: Joi.date().optional(),
		image: Joi.string().optional(),
		collector: JoiObjectId().optional(),
	}),
};
