const UseCase = require('../cores/companies');

exports.createCompany = (req, res, next) => {
	var data = req.body;
	console.log('this is log of company create', data);

	UseCase.createCompany(
		data,
		(err, result) => {
			if (err) {
				next(err);
			} else {
				return res.status(201).send({
					errorCode: 0,
					data: result,
					message: 'succesfull created',
					errors: [],
				});
			}
		},
		next,
	);
};
