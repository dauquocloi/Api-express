const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	createBankAccount: Joi.object().keys({
		accountNumber: Joi.number().integer().required(),
		accountName: Joi.string().required(),
		bankId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
	}),
};
