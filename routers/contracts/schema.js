const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const listFeeInitial = require('../../utils/getListFeeInital');
const initialFeeKeys = listFeeInitial.map((fee) => fee.feeKey);

const customerSchema = Joi.object().keys({
	fullName: Joi.string().required(),
	phone: Joi.string().required(),
	cccd: Joi.string().required(),
	cccdIssueDate: Joi.date().required(),
	cccdIssueAt: Joi.string().required(),
	address: Joi.string().allow(''),
	dob: Joi.date().required(),
	vehicleLicensePlate: Joi.string().allow(null, '').optional(),
	sex: Joi.string().valid('nam', 'nữ').required(),
	job: Joi.string().allow(null, '').empty().optional(),
});

module.exports = {
	id: Joi.object().keys({
		contractId: JoiObjectId().required(),
	}),
	getContractSignedUrl: Joi.object().keys({
		contractCode: Joi.string().required(),
	}),
	setMoveOutDate: Joi.object().keys({
		expectedMoveOutDate: Joi.date().required(),
	}),
	cancelTerminateEarly: Joi.object().keys({
		roomId: JoiObjectId().required(),
	}),
	customerGetContractPdfUrl: Joi.object().keys({
		phone: Joi.string().required(),
	}),
	createContract: Joi.object().keys({
		contractDraftId: JoiObjectId().required(),
		// roomId: JoiObjectId().required(),
		// buildingId: JoiObjectId().required(),
		// depositReceiptId: JoiObjectId().allow(null).optional(),
		// depositId: JoiObjectId().allow(null).optional(),

		// depositVersion: Joi.number().when('depositId', {
		// 	is: JoiObjectId(),
		// 	then: Joi.required().messages({
		// 		'any.required': 'depositVersion là bắt buộc khi có depositId',
		// 	}),
		// 	otherwise: Joi.optional(),
		// }),

		// invoiceId: JoiObjectId().required(),
		// contractEndDate: Joi.date().required(),
		// contractSignDate: Joi.date().required(),
		// contractTerm: Joi.number().required(),
		// room: Joi.object().keys({
		// 	rent: Joi.number().required(),
		// 	depositAmount: Joi.number().required(),
		// 	depositCompletionDate: Joi.date().required(),
		// 	checkinDate: Joi.date().required(),
		// 	rentalTerm: Joi.string().empty().optional(),
		// 	numberOfOccupants: Joi.number().optional(),
		// }),
		// interiors: Joi.array().items(
		// 	Joi.object().keys({
		// 		interiorName: Joi.string().required(),
		// 		quantity: Joi.number().required(),
		// 	}),
		// ),
		// customers: Joi.array().items(
		// 	Joi.object().keys({
		// 		fullName: Joi.string().required(),
		// 		phone: Joi.string().required(),
		// 		cccd: Joi.string().required(),
		// 		cccdIssueDate: Joi.date().required(),
		// 		cccdIssueAt: Joi.string().required(),
		// 		address: Joi.string().required(),
		// 		birthday: Joi.date().required(),
		// 		gender: Joi.string().required(),
		// 	}),
		// ),
		// vehicle: Joi.array().items(
		// 	Joi.object().keys({
		// 		licensePlate: Joi.string().required(),
		// 		ownerPhone: Joi.string().required(),
		// 	}),
		// ),
	}),
	generatePrepareContract: Joi.object().keys({
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		finance: Joi.object().keys({
			rent: Joi.number().min(0).required(),
			depositAmount: Joi.number().min(0).required(),
		}),
		fees: Joi.array().items(
			Joi.object().keys({
				feeAmount: Joi.number().min(0).required(),
				feeKey: Joi.string()
					.valid(...initialFeeKeys)
					.required(),
				firstIndex: Joi.number().optional(),
				secondIndex: Joi.number().optional(),
				quantity: Joi.number().integer().optional(),
			}),
		),
		interiors: Joi.array().items(
			Joi.object().keys({
				interiorName: Joi.string().required(),
				quantity: Joi.number().required(),
			}),
		),
		customers: Joi.array().items(customerSchema),
		note: Joi.string().allow(''),
		stayDays: Joi.number().required(),
		contractPeriod: Joi.object().keys({
			contractSignDate: Joi.date().required(),
			contractEndDate: Joi.date().required(),
			contractTerm: Joi.string().optional(),
		}),
		contractExtention: Joi.object().keys({
			newRent: Joi.number().min(0).required(),
			newDepositAmount: Joi.number().min(0).required(),
			extentionDate: Joi.date().required(),
			version: Joi.number().integer().min(1).required(),
		}),
	}),
};
