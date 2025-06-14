const UseCase = require('../cores/fees');
const { addFeeSchema, editFeeSchema } = require('../utils/validator');
const listFeeInitial = require('../utils/getListFeeInital');

exports.addFee = (req, res, next) => {
	console.log('log of new Fee: ', req.params);
	let data = { ...req.body, ...req.params };
	// const { error, value } = addFeeSchema(data);

	// if (error) {
	// 	console.log(error);
	// 	return res.status(400).json({
	// 		errorCode: 1,
	// 		data: {},
	// 		message: 'Invalid input data',
	// 		errors: error.details.map((err) => err.message),
	// 	});
	// }
	UseCase.addFee(
		data,
		(errs, result) => {
			if (errs) {
				return res.status(204).json({
					errorCode: 0,
					data: {},
					message: 'err',
					errors: [],
				});
			} else {
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

exports.deleteFee = (req, res, next) => {
	console.log(req.params);
	let data = req.params;

	UseCase.deleteFee(
		data,
		(errs, result) => {
			console.log(result);
			if (errs) {
				return res.status(204).json({
					errorCode: 0,
					data: {},
					message: 'err',
					errors: [],
				});
			} else {
				return res.status(200).send({
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

exports.editFee = (req, res, next) => {
	let data = { ...req.params, ...req.body };
	console.log(data);

	const { error, value } = editFeeSchema(data);
	if (error) {
		console.log(error.details);
		return res.status(400).send({
			errorCode: 1,
			data: {},
			message: 'Invalid input data',
			errors: error.details.map((err) => err.message),
		});
	}

	UseCase.editFee(
		data,
		(errs, result) => {
			console.log(result);
			if (errs) {
				return res.status(204).json({
					errorCode: 0,
					data: {},
					message: 'err',
					errors: [],
				});
			} else {
				return res.status(200).send({
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

exports.getFeeInitial = (req, res, next) => {
	const FeeInitial = listFeeInitial;
	console.log('log of getFeeInitial');
	return res.status(200).send({
		errorCode: 0,
		data: FeeInitial,
		message: 'succesfull',
		errors: [],
	});
};
