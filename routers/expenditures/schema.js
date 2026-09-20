const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const { expenditureType } = require('../../constants');

module.exports = {
	id: Joi.object().keys({
		expenditureId: JoiObjectId().required(),
	}),
	getAllExpenditures: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		month: Joi.string().optional(),
		year: Joi.string().optional(),
	}),
	createExpenditure: Joi.object().keys({
		type: Joi.string().valid(expenditureType['INCIDENTAL'], expenditureType['PERIODIC']).required(),
		content: Joi.string().required(),
		amount: Joi.number().required(),
		buildingId: JoiObjectId().required(),
		date: Joi.date().required(),
		spender: JoiObjectId().required(),
	}),
	modifyExpenditure: Joi.object().keys({
		type: Joi.string().valid(expenditureType['INCIDENTAL'], expenditureType['PERIODIC']).required(),
		content: Joi.string().required(),
		amount: Joi.number().required(),
		date: Joi.date().required(),
		spender: JoiObjectId().required(),
		version: Joi.number().integer().min(1).required(),
	}),
	deleteExpenditure: Joi.object().keys({
		type: Joi.string().valid(expenditureType['INCIDENTAL'], expenditureType['PERIODIC']).required(),
	}),
};
