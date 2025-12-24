const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

const feeIndexValuesSchema = Joi.object({
	firstIndex: Joi.number().required(),
	secondIndex: Joi.number().required(),
});

module.exports = {
	id: Joi.object().keys({
		depositRefundId: JoiObjectId().required(),
	}),
	getAllDepositRefunds: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		month: Joi.number().optional(),
		year: Joi.string().optional(),
		mode: Joi.string().optional(),
	}),
	createDepositRefund: Joi.object().keys({
		receiptId: JoiObjectId().required(),
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		contractId: JoiObjectId().required(),
		feeIndexValues: Joi.object().pattern(JoiObjectId(), feeIndexValuesSchema).optional(),
		feesOther: Joi.array().items(
			Joi.object().keys({
				feeContent: Joi.string().required(),
				amount: Joi.number().required(),
			}),
		),
	}),
	modifyDepositRefund: Joi.object().keys({
		version: Joi.number().integer().min(1).required(),
		feeIndexValues: Joi.object().pattern(JoiObjectId(), feeIndexValuesSchema).optional(),
		feesOther: Joi.array().items(
			Joi.object().keys({
				feeContent: Joi.string().required(),
				amount: Joi.number().required(),
			}),
		),
	}),
};
