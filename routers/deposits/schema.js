const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const initialFees = require('../../utils/getListFeeInital');

module.exports = {
	id: Joi.object().keys({
		depositId: JoiObjectId().required(),
	}),
	createDeposit: Joi.object().keys({
		room: Joi.object().keys({
			rent: Joi.number().required(),
			depositAmount: Joi.number().required(),
			depositCompletionDate: Joi.date().required(),
			checkinDate: Joi.date().required(),
			rentalTerm: Joi.string().empty().optional(),
			numberOfOccupants: Joi.number().optional(),
		}),
		interior: Joi.array().items(
			Joi.object().keys({
				interiorName: Joi.string().required(),
				quantity: Joi.number().required(),
			}),
		),
		fees: Joi.array()
			.items(
				Joi.object().keys({
					feeAmount: Joi.number().required(),
					feeKey: Joi.string()
						.valid(...Object.values(initialFees))
						.required(),
					lastIndex: Joi.number().optional(),
				}),
			)
			.optional(),
		customer: Joi.object().keys({
			fullName: Joi.string().required(),
			phone: Joi.string().required(),
			CCCD: Joi.string().required(),
			cccdIssueDate: Joi.date().iso().optional(),
			cccdIssueAt: Joi.string().optional(),
			address: Joi.string().allow(''),
			dob: Joi.date().iso().optional(),
			sex: Joi.string().valid('nam', 'nữ', 'khác').required(),
		}),
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		receiptId: JoiObjectId().required(),
	}),
};
