const { InternalError } = require('../AppError');
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

module.exports = { createCompany, findById, findByUserId };
