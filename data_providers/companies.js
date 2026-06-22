const mongoose = require('mongoose');
const Services = require('../service');
const { NotFoundError, ConflictError } = require('../AppError');

exports.getCompanyPermissions = async (ownerId) => {
	const company = await Services.companies.findByUserId(ownerId).lean().exec();
	if (!company) throw new NotFoundError('User does not belong to any company, please make sure you have been invited to a company');
	return {
		permissions: company.permissions,
		version: company.version,
	};
};

exports.setCompanyPermission = async (ownerId, permission, enabled, version) => {
	const company = await Services.companies.findByUserId(ownerId).lean().exec();
	if (!company) throw new NotFoundError('Company not found !');
	if (company.version !== version) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng reload trang');
	const result = await Services.companies.setCompanyPermission({ companyId: company._id, permission, enabled, version });
	return {
		[permission]: result.permissions[permission],
		version: result.version,
	};
};
