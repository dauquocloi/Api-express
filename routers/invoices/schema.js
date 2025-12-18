const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

const indexValueSchema = Joi.object({
	firstIndex: Joi.number().required(),
	secondIndex: Joi.number().required(),
});

module.exports = {
	id: Joi.object().keys({
		invoiceId: JoiObjectId().required(),
	}),
	getAllInvoices: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		month: Joi.number().optional(),
		year: Joi.number().optional(),
	}),
	modifyInvoice: Joi.object().keys({
		feeIndexValues: Joi.object().pattern(JoiObjectId(), indexValueSchema).required(),
		stayDays: Joi.number().required(),
		version: Joi.number().integer().min(1).required(),
	}),
	createInvoice: Joi.object().keys({
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		stayDays: Joi.number().required(),
		feeIndexValues: Joi.object().pattern(JoiObjectId(), indexValueSchema).required(),
	}),
};
