const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	getUserDetail: Joi.object().keys({
		phone: Joi.string().required(),
	}),
	importPaymentInfo: Joi.object().keys({
		bankAccountId: JoiObjectId().required(),
	}),

	buildingId: Joi.object().keys({
		buildingId: JoiObjectId().required(),
	}),

	createBankAccount: Joi.object().keys({
		accountNumber: Joi.string().required(),
		accountName: Joi.string().required(),
		userId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		bankId: JoiObjectId().required(),
	}),

	userId: Joi.object().keys({
		userId: JoiObjectId().required(),
	}),
};
