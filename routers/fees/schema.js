const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const listFeeInital = require('../../utils/getListFeeInital');
module.exports = {
	id: Joi.object().keys({
		feeId: JoiObjectId().required(),
	}),
	addFee: Joi.object().keys({
		roomId: JoiObjectId().required(),
		feeKey: Joi.string()
			.valid(...Object.values(listFeeInital), 'SPEC101PH')
			.required(),
		feeAmount: Joi.number().min(0).required(),
		lastIndex: Joi.number().optional(),
	}),
	editFee: Joi.object().keys({
		roomId: JoiObjectId().required(),
		feeAmount: Joi.number().min(0).required(),
		lastIndex: Joi.number().optional(),
		version: Joi.number().integer().min(1).required(),
	}),
	deleteFee: Joi.object().keys({
		roomId: JoiObjectId().required(),
	}),
};
