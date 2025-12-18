const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
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
	createContract: Joi.object().keys({
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		depositReceiptId: JoiObjectId().required(),
		depositId: JoiObjectId().optional(),
		depositVersion: Joi.number().when('depositId', {
			is: Joi.exist(),
			then: Joi.required().messages({
				'any.required': 'depositVersion là bắt buộc khi có depositId',
			}),
			otherwise: Joi.optional(),
		}),

		invoiceId: JoiObjectId().required(),
		contractEndDate: Joi.date().required(),
		contractSignDate: Joi.date().required(),
		contractTerm: Joi.number().required(),
		room: Joi.object().keys({
			rent: Joi.number().required(),
			depositAmount: Joi.number().required(),
			depositCompletionDate: Joi.date().required(),
			checkinDate: Joi.date().required(),
			rentalTerm: Joi.string().empty().optional(),
			numberOfOccupants: Joi.number().optional(),
		}),
		interiors: Joi.array().items(
			Joi.object().keys({
				interiorName: Joi.string().required(),
				quantity: Joi.number().required(),
			}),
		),
		customers: Joi.array().items(
			Joi.object().keys({
				fullName: Joi.string().required(),
				phone: Joi.string().required(),
				cccd: Joi.string().required(),
				cccdIssueDate: Joi.date().required(),
				cccdIssueAt: Joi.string().required(),
				address: Joi.string().required(),
				birthday: Joi.date().required(),
				gender: Joi.string().required(),
			}),
		),
		vehicle: Joi.array().items(
			Joi.object().keys({
				licensePlate: Joi.string().required(),
				ownerPhone: Joi.string().required(),
			}),
		),
	}),
};
