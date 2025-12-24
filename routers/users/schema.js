const Joi = require('joi');
const { JoiObjectId } = require('../../utils/validator');
const ROLES = require('../../constants/userRoles');
module.exports = {
	id: Joi.object().keys({
		userId: JoiObjectId().required(),
	}),
	modifyUser: Joi.object().keys({
		status: Joi.number(),
		fullname: Joi.string(),
		phone: Joi.string(),
		cccd: Joi.string(),
		cccdIssueDate: Joi.date(),
		permanentAddress: Joi.string(),
		avatar: Joi.string(),
		birthday: Joi.date(),
	}),
	changeManagerPermission: Joi.object().keys({
		newPermission: Joi.string().required(),
	}),
	changeManagerBuildingManagement: Joi.object().keys({
		buildingIds: Joi.array().items(JoiObjectId()).required(),
		role: Joi.string().valid(ROLES['MANAGER'], ROLES['STAFF']).required(),
	}),
};
