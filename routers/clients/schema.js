const JoiObjectId = require('../../utils/validator').JoiObjectId;
const Joi = require('joi');

module.exports = {
	getContractInfo: Joi.object().keys({
		contractCode: Joi.string().required(),
	}),
	getBill: Joi.object().keys({
		billCode: Joi.string().required(),
	}),
	contractId: Joi.object().keys({
		contractId: JoiObjectId().required(),
	}),
	confirmationContract: Joi.object().keys({
		otp: Joi.string().required(),
	}),
};
