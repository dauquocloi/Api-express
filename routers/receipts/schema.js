const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		receiptId: JoiObjectId().required(),
	}),
	getAllReceipts: Joi.object().keys({
		buildingId: Joi.string().required(),
		month: Joi.string().optional(),
		year: Joi.string().optional(),
	}),
	createReceipt: Joi.object().keys({
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		receiptAmount: Joi.number().required(),
		receiptContent: Joi.string().required(),
		date: Joi.date().optional(),
	}),
	createDepositReceipt: Joi.object().keys({
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		amount: Joi.number().required(),
		payer: Joi.string().required(),
		date: Joi.date().optional(),
	}),
	modifyReceipt: Joi.object().keys({
		amount: Joi.number().required(),
		receiptContent: Joi.string().required(),
	}),
	collectCash: Joi.object().keys({
		amount: Joi.number().min(0).required(),
		date: Joi.date().required(),
		version: Joi.number().integer().min(1).required(),
		idempotencyKey: Joi.string().required(),
		buildingId: JoiObjectId().required(),
	}),
	checkout: Joi.object().keys({
		amount: Joi.number().min(0).required(),
		date: Joi.date().required(),
		version: Joi.number().integer().min(1).required(),
		idempotencyKey: Joi.string().required(),
		buildingId: JoiObjectId().required(),
		paymentMethod: Joi.string().valid('cash', 'transfer').required(),
	}),
	deleteReceipt: Joi.object().keys({
		version: Joi.number().integer().min(1).required(),
	}),
};
