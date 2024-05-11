const UseCase = require('../cores/invoices');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');

const JWT_SECRET = '82371923sdasdads[]sdsadasd';

exports.getAll = (req, res, next) => {
	var data = req.query;
	console.log('This is log of req.query', req.query);
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
	console.log('This is log of invoice create req.body', req.body);

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

exports.update = (req, res, next) => {
	var data = req.body;
	console.log('This is log of invoice update req.body', req.body);
	UseCase.update(data, (err, result) => {
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
