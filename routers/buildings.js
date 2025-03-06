const UseCase = require('../cores/buildings');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');

const JWT_SECRET = '82371923sdasdads[]sdsadasd';

// get all building by managername
exports.getAll = (req, res, next) => {
	var data = req.params;
	console.log('This is log of building getAll', data);
	UseCase.getAll(data, (err, result) => {
		if (err) {
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
	});
};

exports.create = (req, res, next) => {
	var data = req.body;
	console.log('this is log of Building create', data);

	UseCase.create(
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
