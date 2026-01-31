const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const initialFees = require('../../utils/getListFeeInital');
const initialFeeKeys = initialFees.map((fee) => fee.feeKey);

const roomDepositSchema = Joi.object().keys({
	rent: Joi.number().required(),
	depositAmount: Joi.number().required(),
	depositCompletionDate: Joi.date().required(),
	checkinDate: Joi.date().required(),
	rentalTerm: Joi.string().allow('', null).optional(),
	numberOfOccupants: Joi.number().optional(),
});

const customerSchema = Joi.object().keys({
	fullName: Joi.string().required(),
	phone: Joi.string().required(),
	CCCD: Joi.string().required(),
	cccdIssueDate: Joi.date().iso().optional(),
	cccdIssueAt: Joi.string().optional(),
	address: Joi.string().allow(''),
	dob: Joi.date().iso().optional(),
	sex: Joi.string().valid('nam', 'nữ', 'khác').required(),
});

const feeSchema = Joi.object().keys({
	feeAmount: Joi.number().required(),
	feeKey: Joi.string()
		.valid(...initialFeeKeys)
		.required(),
	lastIndex: Joi.number().allow('', null).optional(),
});

const InteriorSchema = Joi.object().keys({
	interiorName: Joi.string().required(),
	quantity: Joi.number().required(),
	interiorRentalDate: Joi.date().optional(),
});

module.exports = {
	id: Joi.object().keys({
		depositId: JoiObjectId().required(),
	}),
	getAllDeposits: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		month: Joi.string().allow('', null).optional(),
		year: Joi.string().allow('', null).optional(),
	}),
	createDeposit: Joi.object().keys({
		room: roomDepositSchema.required(),
		interiors: Joi.array().items(InteriorSchema.required()).optional(),
		fees: Joi.array().items(feeSchema.required()).optional(),
		customer: customerSchema.required(),
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		receiptId: JoiObjectId().required(),
	}),
	modifyDeposit: Joi.object().keys({
		room: roomDepositSchema.required(),
		interior: Joi.array().items(InteriorSchema.required()).optional(),
		fees: Joi.array().items(feeSchema.required()).optional(),
		customer: customerSchema.required(),
	}),
};
