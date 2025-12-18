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
		month: Joi.number().optional(),
		year: Joi.number().optional(),
	}),
	createIncidentalRevenue: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		amount: Joi.number().required(),
		content: Joi.string().required(),
	}),
	modifyIncidentalRevenue: Joi.object().keys({
		amount: Joi.number().required(),
		content: Joi.string().required(),
	}),
	getFees: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		month: Joi.number().optional(),
		year: Joi.number().optional(),
		feeKey: Joi.string()
			.valid(...listFeeKeys)
			.required()
			.messages({
				'any.only': 'Đoán sai rồi, dòng ngu',
				'any.required': 'feeKey là bắt buộc',
				'string.base': 'feeKey phải là chuỗi',
			}),
	}),
};
