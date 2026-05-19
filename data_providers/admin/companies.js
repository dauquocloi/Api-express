const Services = require('../../service');
const { COMPANIES_STATUS } = require('../../constants/companies');
const { BadRequestError } = require('../../AppError');

const createCompany = async (data) => {
	const user = await Services.users.findById(data.userId).lean().exec();
	if (!user) throw new BadRequestError('User not found');

	const result = await Services.companies.createCompany({
		fullName: data.fullName,
		shortName: data.shortName,
		status: COMPANIES_STATUS.PENDING,
		user: user._id,
	});
	return result;
};

module.exports = { createCompany };
