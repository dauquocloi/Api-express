const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const listFeeInitials = require('../../utils/getListFeeInital');
const listFeeKeys = listFeeInitials.map((fee) => fee.feeKey.slice(0, -2));
module.exports = {
	id: Joi.object().keys({
		revenueId: Joi.string().required(),
	}),
	getAllRevenues: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		month: Joi.string().optional(),
		year: Joi.string().optional(),
	}),
	getFees: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		month: Joi.string().optional(),
		year: Joi.string().optional(),
		feeKey: Joi.string()
			.valid(...listFeeKeys, 'SPEC101')
			.required()
			.messages({
				'any.only': 'Đoán sai rồi, dòng ngu',
				'any.required': 'feeKey là bắt buộc',
				'string.base': 'feeKey phải là chuỗi',
			}),
	}),
};
