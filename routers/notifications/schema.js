const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const { notificationTypes } = require('../../constants/notifications');

module.exports = {
	id: Joi.object().keys({
		notificationId: JoiObjectId().required(),
	}),
	setNotiSetting: Joi.object().keys({
		type: Joi.string()
			.valid(...Object.values(notificationTypes))
			.required(),
		enabled: Joi.boolean().required(),
	}),
	getAllNotis: Joi.object().keys({
		page: Joi.string().required(),
	}),
};
