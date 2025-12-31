const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

const indexValueSchema = Joi.object({
	firstIndex: Joi.number().required(),
	secondIndex: Joi.number().required(),
});

module.exports = {
	id: Joi.object().keys({
		checkoutCostId: JoiObjectId().required(),
	}),
	modifyCheckoutCost: Joi.object().keys({
		feeIndexValues: Joi.object().pattern(JoiObjectId(), indexValueSchema).required(),
		version: Joi.number().integer().min(1).required(),
		feesOther: Joi.array().items(
			Joi.object().keys({
				feeContent: Joi.string().required(),
				amount: Joi.number().required(),
			}),
		),
		stayDays: Joi.number().optional(),
	}),
	terminateCheckoutCost: Joi.object().keys({
		version: Joi.number().integer().min(1).required(),
	}),
};
