const UseCase = require('../cores/deposits');
const { createDepositSchema } = require('../utils/validator');

exports.createDeposit = (req, res, next) => {
	let data = { ...req.params, ...req.body };
	console.log('this is log of createDeposit: ', data);

	const { error, value } = createDepositSchema(data.room, data.customer, data.receiptId);
	if (error) {
		console.log('Log of error from createDepositValidator', error);
		return res.status(400).send({
			errorCode: 1,
			data: {},
			message: 'Invalid input data',
			errors: error.details.map((err) => err.message),
		});
	}

	UseCase.createDeposit(
		data,
		(error, result) => {
			if (!error) {
				return res.status(200).json({
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

exports.getListDeposits = (req, res, next) => {
	let data = req.params;
	console.log('this is log of getListDeposits: ', data);

	UseCase.getListDeposits(
		data,
		(error, result) => {
			if (!error) {
				return res.status(200).json({
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

exports.getDepositDetail = (req, res, next) => {
	let data = req.params;
	console.log('this is log of getDepositDetail: ', data);

	UseCase.getDepositDetail(
		data,
		(error, result) => {
			if (!error) {
				return res.status(200).json({
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
