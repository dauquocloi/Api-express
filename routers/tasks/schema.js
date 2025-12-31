const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		taskId: JoiObjectId().required(),
	}),
	getTasks: Joi.object().keys({
		page: Joi.string().optional(),
		data: Joi.object()
			.keys({
				search: Joi.string().allow('').optional(),
				startDate: Joi.date().optional(),
				endDate: Joi.date().optional(),
			})
			.optional(),
	}),
	createTask: Joi.object().keys({
		taskContent: Joi.string().required(),
		performers: Joi.array().items(JoiObjectId()).allow().optional(),
		detail: Joi.string().allow('', null).optional(),
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
