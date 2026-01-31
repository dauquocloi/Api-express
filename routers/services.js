// const UseCase = require('../cores/services');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const { result } = require('underscore');

// const JWT_SECRET = '82371923sdasdads[]sdsadasd';

// // Get all by roomid
// exports.getAll = (req, res, next) => {
// 	var data = req.query;
// 	console.log('This is log of req.body', req.query);
// 	UseCase.getAll(data, (err, result) => {
// 		if (err) {
// 			return res.status(204).send({
// 				errorCode: 0,
// 				data: {},
// 				message: 'err',
// 				errors: [],
// 			});
// 		} else {
// 			return res.status(200).send({
// 				errorCode: 0,
// 				data: result,
// 				message: 'succesfull',
// 				errors: [],
// 			});
// 		}
// 	});
// };

// exports.create = (req, res, next) => {
// 	var data = req.body;
// 	console.log(data);

// 	UseCase.create(data, (err, result) => {
// 		if (err) {
// 			return res.status(204).send({
// 				errorCode: 0,
// 				data: {},
// 				message: 'created fail',
// 				errors: [],
// 			});
// 		} else {
// 			return res.status(201).send({
// 				errorCode: 0,
// 				data: result,
// 				message: 'succesfull created',
// 				errors: [],
// 			});
// 		}
// 	});
// };
