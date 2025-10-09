const UseCase = require('../cores/buildings');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');
const verifyToken = require('../utils/verifyToken');

const JWT_SECRET = '82371923sdasdads[]sdsadasd';

// get all building by managername
exports.getAll = async (req, res, next) => {
	const authHeader = req.headers['authorization'];
	console.log('log of buildings/getAll', authHeader);
	if (!authHeader) {
		next(new Error());
	}
	const token = authHeader.split(' ')[1]; // Bỏ qua chữ 'Bearer'
	console.log('log of token: ', token);
	const data = verifyToken(token);

	console.log('This is log of data from building getAll', data);
	UseCase.getAll(
		data,
		(err, result) => {
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
		},
		next,
	);
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

exports.getBankStatus = (req, res, next) => {
	var data = req.body;

	UseCase.getBankStatus(
		data,
		(err, result) => {
			if (err) {
				next(err);
			} else {
				return res.status(200).send({
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

exports.getBuildingContract = (req, res, next) => {
	var data = req.params;
	console.log('log of data from getBuildingContract: ', data);

	UseCase.getBuildingContract(
		data,
		(err, result) => {
			if (!err) {
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

exports.importContractFile = (req, res, next) => {
	const { file } = req;
	var data = { ...req.params, file };
	console.log('log of data from importContractFile: ', data);

	UseCase.importContractFile(
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

exports.importDepositTermFile = (req, res, next) => {
	const { file } = req;
	var data = { ...req.params, file };
	console.log('log of data from importDepositTermFile: ', data);

	UseCase.importDepositTermFile(
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

exports.getDepositTermFile = (req, res, next) => {
	var data = req.params;
	console.log('log of data from getDepositTermFile: ', data);

	UseCase.getDepositTermFile(
		data,
		(err, result) => {
			if (!err) {
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

exports.getBillCollectionProgress = (req, res, next) => {
	var data = req.params;
	console.log('log of data from getBillCollectionProgress: ', data);

	UseCase.getBillCollectionProgress(
		data,
		(err, result) => {
			if (!err) {
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
