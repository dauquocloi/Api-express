const Services = require('../service');

module.exports = (execution) => async (req, res, next) => {
	try {
		await execution(req, res, next);
	} catch (error) {
		next(error);
	}
};
