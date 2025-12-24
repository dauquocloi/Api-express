const Joi = require('joi');

module.exports = {
	getBill: Joi.object().keys({
		billCode: Joi.string().required(),
	}),
};
