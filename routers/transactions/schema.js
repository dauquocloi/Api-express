const JoiObjectId = require('../../utils/validator').JoiObjectId;
const Joi = require('joi');

module.exports = {
	id: Joi.object().keys({
		transactionId: JoiObjectId().required(),
	}),
	declineTransaction: Joi.object().keys({
		reason: Joi.string().allow('').optional(),
		buildingId: JoiObjectId().required(),
		version: Joi.number().integer().min(1).required(),
	}),
};
