const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		expenditureId: JoiObjectId().required(),
	}),
	getAllExpenditures: {
		buildingId: JoiObjectId().required(),
		month: Joi.number().optional(),
		year: Joi.number().optional(),
	},
	createExpenditure: Joi.object().keys({
		type: Joi.string().valid('incidental', 'periodic').required(),
		content: Joi.string().required(),
		amount: Joi.number().required(),
		buildingId: JoiObjectId().required(),
		date: Joi.date().required(),
	}),
	modifyExpenditure: Joi.object().keys({
		type: Joi.string().valid('incidental', 'periodic').required(),
		content: Joi.string().required(),
		amount: Joi.number().required(),
		date: Joi.date().required(),
	}),
};
