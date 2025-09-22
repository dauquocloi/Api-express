const UseCase = require('../cores/expenditures');

exports.createExpenditure = (req, res, next) => {
	var data = { ...req.body, ...req.params };
	console.log('this is log of createExpenditure', data);

	UseCase.createExpenditure(
		data,
		(err, result) => {
			if (!err) {
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

exports.modifyExpenditure = (req, res, next) => {
	var data = { ...req.body, ...req.params };
	console.log('this is log of modifyExpenditure', data);

	UseCase.modifyExpenditure(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'succesfull updated',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.deleteExpenditure = (req, res, next) => {
	var data = { ...req.params, ...req.body };
	console.log('this is log of deleteExpenditure', data);

	UseCase.deleteExpenditure(
		data,
		(err, result) => {
			if (!err) {
				return res.status(201).send({
					errorCode: 0,
					data: result,
					message: 'succesfull',
					errors: [],
				});
			}
		},
		next,
	);
};
