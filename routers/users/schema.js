const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const ROLES = require('../../constants/userRoles');
module.exports = {
	id: Joi.object().keys({
		userId: JoiObjectId().required(),
	}),
	// modifyUser: Joi.object().keys({
	// 	status: Joi.number(),
	// 	fullname: Joi.string(),
	// 	phone: Joi.string(),
	// 	cccd: Joi.string(),
	// 	cccdIssueDate: Joi.date(),
	// 	permanentAddress: Joi.string(),
	// 	avatar: Joi.string(),
	// 	birthday: Joi.date(),
	// }),
	changeManagerPermission: Joi.object().keys({
		newPermission: Joi.string().required(),
	}),
	changeManagerBuildingManagement: Joi.object().keys({
		buildingIds: Joi.array().items(JoiObjectId()).required(),
		role: Joi.string().valid(ROLES['MANAGER'], ROLES['STAFF']).required(),
	}),
	createManagement: Joi.object().keys({
		fullName: Joi.string().required(),
		phone: Joi.string().required(),
		dob: Joi.date().required(),
		cccd: Joi.string().required(),
		cccdIssueDate: Joi.date().required(),
		cccdIssueAt: Joi.string().required(),
		permanentAddress: Joi.string().required(),
		role: Joi.string().valid(ROLES['MANAGER'], ROLES['STAFF']).required(),
		gender: Joi.string().valid('nam', 'nữ').required(),
		buildingIds: Joi.array().items(JoiObjectId()).required(),
	}),
	addDevice: Joi.object().keys({
		deviceId: Joi.string().required(),
		platform: Joi.string().valid('android', 'ios').required(),
		expoPushToken: Joi.string().required(),
	}),
};
