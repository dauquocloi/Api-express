const UseCase = require('../cores/fees');
const { addFeeSchema, validateEditFee } = require('../utils/validator');
const listFeeInitial = require('../utils/getListFeeInital');
const { errorCodes } = require('../constants/errorCodes');

exports.addFee = (req, res, next) => {
	console.log('log of data from addFee: ', req.params);
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

	console.log('log of data from editFee: ', data);

	const { error, value } = validateEditFee(data);
	if (error) {
		console.error('log of error input from edit fee:', error.details);
		return res.status(400).send({
			errorCode: errorCodes.invalidInput,
			message: 'Invalid input data',
			errors: error.details.map((err) => err.message),
		});
	}

	UseCase.editFee(
		value,
		(errs, result) => {
			if (!errs) {
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
