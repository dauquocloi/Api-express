const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');

module.exports = {
	id: Joi.object().keys({
		customerId: JoiObjectId().required(),
	}),
	getAllCustomers: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		status: Joi.string().required(),
	}),
	getListSelections: {
		roomId: JoiObjectId().required(),
	},
	createCustomer: {
		roomId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		fullName: Joi.string().required(),
		phone: Joi.string().required(),
		cccd: Joi.string().required(),
		cccdIssueDate: Joi.date().required(),
		cccdIssueAt: Joi.string().required(),
		address: Joi.string().required(),
		birthday: Joi.date().required(),
		gender: Joi.string().required(),
	},
	modifyCustomer: {
		roomId: JoiObjectId().required(),
		fullName: Joi.string().required(),
		phone: Joi.string().required(),
		cccd: Joi.string().required(),
		cccdIssueDate: Joi.date().optional(),
		cccdIssueAt: Joi.string().optional(),
		permanentAddress: Joi.string().optional(),
		birthday: Joi.date().required(),
		gender: Joi.string().required(),
		isContractOwner: Joi.boolean().optional(),
	},
};
