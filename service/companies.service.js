const { InternalError, NotFoundError, ConflictError } = require('../AppError');
const Entity = require('../models');

const findById = (companyId) => Entity.CompaniesEntity.findById(companyId);

const findByUserId = (userId) => Entity.CompaniesEntity.findOne({ user: userId });

const createCompany = async ({ fullName, shortName, status, user }, session = null) => {
	const [result] = await Entity.CompaniesEntity.create(
		[
			{
				fullName,
				shortName,
				status,
				user,
			},
		],
		{ session },
	);

	if (!result) throw new InternalError('Create company fail');
	return result.toObject();
};

const setCompanyPermission = async ({ companyId, permission, enabled, version }, session = null) => {
	const result = await Entity.CompaniesEntity.findOneAndUpdate(
		{ _id: companyId, version },
		{
			$set: { [`permissions.${permission}`]: enabled },
			$inc: { version: 1 },
		},
		{
			new: true,
			session,
		},
	);

	if (!result) throw new ConflictError('Dữ liệu đã bị thay đổi, vui liệu reload trang');
	return result.toObject();
};

module.exports = { createCompany, findById, findByUserId, setCompanyPermission };
