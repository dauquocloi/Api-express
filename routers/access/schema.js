const Joi = require('joi');
const { JoiAuthBearer } = require('../../utils/validator');
const Roles = require('../../constants/userRoles');

module.exports = {
	credential: Joi.object().keys({
		userName: Joi.string().required(),
		password: Joi.string().required().min(6),
	}),
	refreshToken: Joi.object().keys({
		refreshToken: Joi.string().required().min(1),
	}),
	auth: Joi.object()
		.keys({
			authorization: JoiAuthBearer().required(),
		})
		.unknown(true),
	signup: Joi.object().keys({
		name: Joi.string().required().min(3),
		userName: Joi.string().required(),
		password: Joi.string().required().min(6),
		profilePicUrl: Joi.string().optional().uri(),
		phone: Joi.string().optional().min(10),
		role: Joi.string()
			.valid(...Object.values(Roles))
			.required(),
	}),
};
