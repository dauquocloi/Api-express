const Services = require('../../service');

exports.getUserDetail = async (phone) => {
	const result = await Services.users.findUserByPhone(phone);
	return result;
};
