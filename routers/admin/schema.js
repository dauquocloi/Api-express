const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const ROLES = require('../../constants/userRoles');

module.exports = {
	getUserDetail: Joi.object().keys({
		phone: Joi.string().required(),
	}),
	importPaymentInfo: Joi.object().keys({
		bankAccountId: JoiObjectId().required(),
	}),

	importBuilding: Joi.object().keys({
		ownerId: JoiObjectId().required(),
		companyId: JoiObjectId().required(),
		buildingName: Joi.string().required(),
		buildingAddress: Joi.string().required(),
		roomQuantity: Joi.number().optional(),
		invoiceNotes: Joi.string().optional(),
	}),

	buildingId: Joi.object().keys({
		buildingId: JoiObjectId().required(),
	}),

	createBankAccount: Joi.object().keys({
		accountNumber: Joi.string().required(),
		accountName: Joi.string().required(),
		userId: JoiObjectId().required(),
		buildingId: JoiObjectId().required(),
		bankId: JoiObjectId().required(),
	}),

	userId: Joi.object().keys({
		userId: JoiObjectId().required(),
	}),

	createCompany: Joi.object().keys({
		fullName: Joi.string().required(),
		shortName: Joi.string().required(),
		userId: JoiObjectId().required(),
	}),

	createUser: Joi.object().keys({
		fullName: Joi.string().required(),
		phone: Joi.string().required(),
		dob: Joi.date().required(),
		cccd: Joi.string().required(),
		cccdIssueDate: Joi.date().required(),
		cccdIssueAt: Joi.string().required(),
		permanentAddress: Joi.string().required(),
		role: Joi.string().valid(ROLES['MANAGER'], ROLES['STAFF'], ROLES['CUSTOMER'], ROLES['OWNER']).required(),
		gender: Joi.string().valid('nam', 'nữ').required(),
	}),
};
