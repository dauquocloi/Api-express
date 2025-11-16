const UseCase = require('../cores/vehicles');
const { editVehicleSchema } = require('../utils/validator');
const { validateGetVehicle, validateCreateVehicle } = require('../utils/validator');
const validator = require('../utils/validator');

exports.getAll = (req, res, next) => {
	var data = req.params;
	console.log('log of data from getAll vehicle: ', req.params);
	UseCase.getAll(
		data,
		(err, result) => {
			if (!err) {
				setTimeout(
					() =>
						res.status(200).send({
							errorCode: 0,
							data: result,
							message: 'succesfull',
							errors: [],
						}),
					1000,
				);
			}
		},
		next,
	);
};

exports.editVehicle = (req, res, next) => {
	const { error, value } = editVehicleSchema(req.body);
	console.log(req.body);

	let vehicleImage;
	if (req.file?.fieldname == 'image') {
		vehicleImage = req.file;
	}

	let data = { ...req.params, ...req.body, vehicleImage };
	console.log('log of data from edit vehicle: ', data);
	if (error) {
		console.log(error);
		return res.status(400).send({
			errorCode: 1,
			data: {},
			message: 'Invalid input data',
			errors: error.details.map((err) => err.message),
		});
	}
	UseCase.editVehicle(
		data,
		(err, result) => {
			if (err) {
				return res.status(204).json({
					errorCode: 0,
					data: {},
					message: err.message,
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

exports.addVehicle = (req, res, next) => {
	try {
		const { error, value } = validateCreateVehicle(req.body, req.params);

		if (error) {
			console.log(error);
			return res.status(400).send({
				errorCode: 1,
				data: {},
				message: 'Invalid input data',
				errors: error.details.map((err) => err.message),
			});
		}

		const data = { ...req.params, ...req.body, ...req.file };
		console.log('log of data from addVehicle', data);
		UseCase.addVehicle(
			data,
			(err, result) => {
				if (err) {
					return res.status(204).json({
						errorCode: 0,
						data: {},
						message: err.message,
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
	} catch (error) {
		next(error);
	}
};

exports.getVehicle = (req, res, next) => {
	try {
		const data = req.params;
		console.log('log of data from getVehicle: ', data);
		const { error, value } = validateGetVehicle(data);

		if (error) {
			return res.status(400).send({
				errorCode: 1,
				data: {},
				message: 'Invalid input data',
				errors: error.details.map((err) => err.message),
			});
		}

		UseCase.getVehicle(
			data,
			(err, result) => {
				if (result) {
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
	} catch (error) {
		next(error);
	}
};
