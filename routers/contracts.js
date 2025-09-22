const UseCase = require('../cores/contracts');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');
const { validateGenerateContract } = require('../utils/validator');

const JWT_SECRET = '82371923sdasdads[]sdsadasd';

exports.getAll = (req, res, next) => {
	var data = req.body;
	UseCase.getAll(data, (err, result) => {
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
	});
};

exports.create = (req, res, next) => {
	var data = req.body;
	// console.log('log of contract create', data);

	UseCase.create(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'created fail',
				errors: [],
			});
		} else {
			return res.status(201).send({
				errorCode: 0,
				data: result,
				message: 'succesfull created',
				errors: [],
			});
		}
	});
};

exports.updateOne = (req, res) => {
	var data = req.body;
	console.log(data.namecontractowner);
	UseCase.updateOne(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'created fail',
				errors: [],
			});
		} else {
			return res.status(201).send({
				errorCode: 0,
				data: result,
				message: 'succesfull created',
				errors: [],
			});
		}
	});
};

exports.generateContract = (req, res, next) => {
	try {
		console.log('log of data from generateContract: ', req.body);
		const { error, value } = validateGenerateContract(req.body);
		if (error) {
			console.error('Log of error from generateContract', error);
			return res.status(400).send({
				errorCode: 1,
				data: {},
				message: 'Invalid input data',
				errors: error.details.map((err) => err.message),
			});
		}

		UseCase.generateContract(
			value,
			(err, result) => {
				if (!err) {
					return res.status(201).send({
						errorCode: 0,
						data: result,
						message: 'successfully',
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

exports.getContractPdfSignedUrl = (req, res, next) => {
	let data = req.params;
	console.log('log of data from getContractPdfSignedUrl: ', data);
	UseCase.getContractPdfSignedUrl(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'successfully',
					errors: [],
				});
			}
		},
		next,
	);
};
