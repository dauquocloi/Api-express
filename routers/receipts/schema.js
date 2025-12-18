const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		receiptId: Joi.string().required(),
	}),
	getAllReceipts: Joi.object().keys({
		buildingId: Joi.string().required(),
		month: Joi.number().optional(),
		year: Joi.number().optional(),
	}),
	createReceipt: Joi.object().keys({
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		receiptAmount: Joi.number().required(),
		receiptContent: Joi.string().required(),
	}),
	modifyReceipt: Joi.object().keys({
		amount: Joi.number().required(),
		receiptContent: Joi.string().required(),
	}),
	collectCash: Joi.object().keys({
		amount: Joi.number().min(0).required(),
		date: Joi.date().required(),
		version: Joi.number().integer().min(1).required(),
	}),
};
