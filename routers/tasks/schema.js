const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		taskId: JoiObjectId().required(),
	}),
	getTasks: Joi.object().keys({
		page: Joi.number().optional(),
		search: Joi.string().optional(),
		startDate: Joi.date().optional(),
		endDate: Joi.date().optional(),
	}),
	createTask: Joi.object().keys({
		taskContent: Joi.string().required(),
		performers: Joi.array().items(JoiObjectId()).required(),
		detail: Joi.string().required(),
		executionDate: Joi.date().required(),
	}),
	modifyTask: Joi.object().keys({
		taskContent: Joi.string().required(),
		performers: Joi.array().items(JoiObjectId()).required(),
		detail: Joi.string().required(),
		executionDate: Joi.date().required(),
		status: Joi.string().valid('pending', 'completed').required(),
	}),
};
