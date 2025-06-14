var UseCase = require('../cores/transactions');

exports.collectCashFromEmployee = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.user };
		console.log('log of collectCashFromEmployee', data);
		UseCase.collectCashFromEmployee(
			data,
			(err, result) => {
				if (!err) {
					return res.status(200).json({
						errorCode: 0,
						message: 'succesfull',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};
