const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const listFeeInitial = require('../../utils/getListFeeInital');
const { getDebtsReceiptsUnpaidUsedFor } = require('../../constants');
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
	contractDraftId: Joi.object().keys({
		contractDraftId: JoiObjectId().required(),
	}),
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
	}),
	getDebtsAndReceiptsUnpaid: Joi.object().keys({
		usedFor: Joi.string()
			.valid(...Object.values(getDebtsReceiptsUnpaidUsedFor))
			.required(),
	}),
	contractExtention: Joi.object().keys({
		newRent: Joi.number().min(0).required(),
		newDepositAmount: Joi.number().min(0).required(),
		extentionDate: Joi.date().required(),
		version: Joi.number().integer().min(1).required(),
	}),

	generateFirstInvoiceAndDepositReceipt: Joi.object().keys({
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

		stayDays: Joi.number().min(0).max(60).required(),
	}),

	generateContractDraft: Joi.object().keys({
		roomId: JoiObjectId().required(),
		finance: Joi.object().keys({
			rent: Joi.number().min(0).required(),
			depositAmount: Joi.number().min(0).required(),
		}),
		fees: Joi.array().items(
			Joi.object().keys({
				feeName: Joi.string().optional(),
				feeAmount: Joi.number().min(0).required(),
				feeKey: Joi.string()
					.valid(...initialFeeKeys)
					.required(),
				unit: Joi.string().optional(),
			}),
		),
		interiors: Joi.array().items(
			Joi.object().keys({
				interiorName: Joi.string().required(),
				quantity: Joi.number().required(),
			}),
		),
		customers: Joi.array().items(customerSchema),
		note: Joi.string().allow('', null).optional(),
		contractPeriod: Joi.object().keys({
			contractSignDate: Joi.date().required(),
			contractEndDate: Joi.date().required(),
			contractTerm: Joi.string().optional(),
		}),
	}),
};
