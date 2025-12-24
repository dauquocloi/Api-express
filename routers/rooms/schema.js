const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

const indexValueSchema = Joi.object({
	firstIndex: Joi.number().required(),
	secondIndex: Joi.number().required(),
});

module.exports = {
	id: Joi.object().keys({
		roomId: JoiObjectId().required(),
	}),
	paramsWithInterior: Joi.object({
		roomId: JoiObjectId().required(),
		interiorId: JoiObjectId().required(),
	}),
	interiorBody: Joi.object().keys({
		interiorName: Joi.string().required(),
		interiorQuantity: Joi.number().required(),
		interiorRentalDate: Joi.date().optional(),
	}),
	generateReceiptInvoiceBody: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		depositAmount: Joi.number().required(),
		stayDays: Joi.number().required(),
		feeIndexValues: Joi.object().pattern(JoiObjectId(), indexValueSchema).optional(),
		payer: Joi.string().required(),
	}),
	modifyRent: Joi.object().keys({
		newRent: Joi.number().required(),
	}),
	generateCheckoutCost: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		contractId: JoiObjectId().required(),
		roomId: JoiObjectId().required(),
		feesOther: Joi.array()
			.items(Joi.object().keys({ amount: Joi.number().required(), feeContent: Joi.string().required() }))
			.optional(),
		stayDays: Joi.number().required(),
		feeIndexValues: Joi.object().pattern(JoiObjectId(), indexValueSchema).optional(),

		roomVersion: Joi.number().integer().min(1).required(),
	}),
	getDebtsAndReceiptUnpaid: Joi.object().keys({
		buildingId: JoiObjectId().required(),
	}),
};
