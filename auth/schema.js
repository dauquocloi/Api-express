const { JoiAuthBearer } = require('../utils/validator');

const Joi = require('joi');

module.exports = {
	// apiKey: Joi.object()
	// 	.keys({
	// 		[Header.API_KEY]: Joi.string().required(),
	// 	})
	// 	.unknown(true),
	auth: Joi.object()
		.keys({
			authorization: JoiAuthBearer().required(),
		})
		.unknown(true),
};
