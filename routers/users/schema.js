const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		userId: JoiObjectId().required(),
	}),
	modifyUser: Joi.object().keys({
		status: Joi.number(),
		fullname: Joi.string(),
		phone: Joi.string(),
		cccd: Joi.string(),
		cccdIssueDate: Joi.date(),
		permanentAddress: Joi.string(),
		avatar: Joi.string(),
		birthday: Joi.date(),
	}),
};
