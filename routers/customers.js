const UseCase = require('../cores/customers');
const { validateCreateCustomer } = require('../utils/validator');
exports.getAll = (req, res, next) => {
	try {
		var data = { ...req.params, ...req.query };
		console.log('log of data from getAllCustomers: ', data);
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
	} catch (error) {
		next(error);
	}
};

exports.getCustomerById = (req, res, next) => {
	let data = req.params;
	console.log('log of getCustomerById', data);
	UseCase.getCustomerById(
		data,
		(err, result) => {
			if (err) {
				return res.status(204).send({
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

exports.editCustomer = (req, res, next) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from editCustomer: ', data);
	const { error, value } = validateCreateCustomer(data);
	if (error) {
		console.log(error);
		return res.status(400).send({
			errorCode: 1,
			data: {},
			message: 'Invalid input data',
			errors: error.details.map((err) => err.message),
		});
	}

	UseCase.editCustomer(
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
};

exports.addCustomer = (req, res, next) => {
	console.log('log of data from addCustomer: ', req.body);
	const { error, value } = validateCreateCustomer(req.body);
	if (error) {
		return res.status(400).send({
			errorCode: 40000,
			message: 'Invalid input data',
			errors: error.details.map((err) => err.message),
		});
	}
	let data = { ...req.params, ...req.body };

	UseCase.addCustomer(
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

exports.setCustomerStatus = (req, res, next) => {
	let data = req.params;
	console.log('log of data from setStatusCustomer: ', data);
	const { error, value } = modifyCustomerSchema(data);
	if (error) {
		console.log(error);
		return res.status(400).send({
			errorCode: 1,
			data: {},
			message: 'Invalid input data',
			errors: error.details.map((err) => err.message),
		});
	}

	UseCase.setCustomerStatus(
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

exports.getCustomerLeaved = (req, res, next) => {
	let data = req.params;
	console.log('log of getCustomerLeaved', data);
	UseCase.getCustomerLeaved(
		data,
		(err, result) => {
			if (err) {
				return res.status(204).send({
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

exports.getListSelectingCustomer = (req, res, next) => {
	let data = req.params;
	console.log('log of getListSelectingCustomer', data);
	UseCase.getListSelectingCustomer(
		data,
		(err, result) => {
			if (err) {
				return res.status(204).send({
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
