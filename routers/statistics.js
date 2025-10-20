const UseCase = require('../cores/statistics');

exports.getRevenues = async (req, res, next) => {
	let data = { ...req.params, ...req.query };
	console.log('log of data from getRevenues: ', data);

	UseCase.getRevenues(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},

		next,
	);
};

exports.getExpenditures = async (req, res, next) => {
	let data = { ...req.params, ...req.query };
	console.log('log of data from getExpenditures: ', data);

	UseCase.getExpenditures(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.getStatistics = async (req, res, next) => {
	let data = { ...req.params, ...req.query };
	console.log('log of data from getStatistics: ', data);

	UseCase.getStatistics(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.getStatisticGeneral = (req, res, next) => {
	let data = { ...req.params, ...req.query };

	console.log('log of data from getStatisticGeneral: ', data);

	UseCase.getStatisticGeneral(
		data,
		(err, result) => {
			if (result) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};
