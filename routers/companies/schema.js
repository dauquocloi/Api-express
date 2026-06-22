const Joi = require('joi');
const { PERMISSIONS } = require('../../constants/permissions');

module.exports = {
	setCompanyPermission: Joi.object().keys({
		permission: Joi.string()
			.valid(
				PERMISSIONS['COLLECT_CASH'],
				PERMISSIONS['EDIT_FEE'],
				PERMISSIONS['EDIT_BILL'],
				PERMISSIONS['DELETE_BILL'],
				PERMISSIONS['EDIT_CONTRACT'],
			)
			.required(),
		enabled: Joi.boolean().required(),
		version: Joi.number().required(),
	}),
};
