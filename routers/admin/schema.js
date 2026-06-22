const Joi = require('joi');
const { JoiObjectId, JoiFile } = require('../../utils/validator');
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
	importBuildingFiles: Joi.object().keys({
		contractPdfUrl: Joi.array()
			.items(JoiFile('contractPdfUrl', ['application/pdf']))
			.length(1)
			.required(),
		contractDocxUrl: Joi.array()
			.items(JoiFile('contractDocxUrl', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']))
			.length(1)
			.required()
			.messages({
				'any.required': 'Vui lòng tải lên file hợp đồng thuê',
			}),
		depositTermUrl: Joi.array()
			.items(JoiFile('depositTermUrl', ['application/pdf']))
			.length(1)
			.optional(),
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

	importRooms: Joi.object().keys({
		buildingId: JoiObjectId().required(),
		ownerId: JoiObjectId().required(),
	}),

	roomFile: JoiFile('roomFile', ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
		.required()
		.messages({
			'any.required': 'Vui lòng tải lên file Excel',
		}),
};
