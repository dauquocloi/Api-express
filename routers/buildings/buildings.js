const UseCase = require('../../data_providers/buildings');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');
const verifyToken = require('../../utils/verifyToken');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
// get all building by managername

exports.getAll = asyncHandler(async (req, res) => {
	const data = req.user;
	// console.log('This is log of data from building getAll', data);

	const result = await UseCase.getAll(data._id);
	return new SuccessResponse('Success', result).send(res);
	// UseCase.getAll(
	// 	data,
	// 	(err, result) => {
	// 		if (!err) {
	// 			return res.status(200).send({
	// 				errorCode: 0,
	// 				data: result,
	// 				message: 'succesfull',
	// 				errors: [],
	// 			});
	// 		}
	// 	},
	// 	next,
	// );
});

exports.getRooms = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('This is log of rooms/getall', req.params);
	const rooms = await UseCase.getRooms(data);
	return new SuccessResponse('Success', rooms).send(res);

	// UseCase.getAll(
	// 	data,
	// 	(err, result) => {
	// 		if (!err) {
	// 			return res.status(200).send({
	// 				errorCode: 0,
	// 				data: result,
	// 				message: 'succesfull',
	// 				errors: [],
	// 			});
	// 		}
	// 	},
	// 	next,
	// );
});

exports.getBillCollectionProgress = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from getBillCollectionProgress: ', data);
	const result = await UseCase.getBillCollectionProgress(data);
	return new SuccessResponse('Success', result).send(res);

	// UseCase.getBillCollectionProgress(
	// 	data,
	// 	(err, result) => {
	// 		if (!err) {
	// 			return res.status (200).send({
	// 				errorCode: 0,
	// 				data: result,
	// 				message: 'succesfull',
	// 				errors: [],
	// 			});
	// 		}
	// 	},
	// 	next,
	// );
});

exports.getListSectingRooms = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from getListSectingRooms: ', data);
	const result = await UseCase.getListSelectingRoom(data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getAllCheckoutCosts = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of data from getCheckoutCosts: ', data);
	const result = await UseCase.getCheckoutCosts(data.buildingId, Number(data.month), Number(data.year));
	return new SuccessResponse('Success', result).send(res);
});

// exports.create = (req, res, next) => {
// 	var data = req.body;
// 	console.log('this is log of Building create', data);

// 	UseCase.create(
// 		data,
// 		(err, result) => {
// 			if (err) {
// 				next(err);
// 			} else {
// 				return res.status(201).send({
// 					errorCode: 0,
// 					data: result,
// 					message: 'succesfull created',
// 					errors: [],
// 				});
// 			}
// 		},
// 		next,
// 	);
// };

// exports.getBankStatus = (req, res, next) => {
// 	var data = req.body;

// 	UseCase.getBankStatus(
// 		data,
// 		(err, result) => {
// 			if (err) {
// 				next(err);
// 			} else {
// 				return res.status(200).send({
// 					errorCode: 0,
// 					data: result,
// 					message: 'succesfull created',
// 					errors: [],
// 				});
// 			}
// 		},
// 		next,
// 	);
// };

// exports.getBuildingContract = (req, res, next) => {
// 	var data = req.params;
// 	console.log('log of data from getBuildingContract: ', data);

// 	UseCase.getBuildingContract(
// 		data,
// 		(err, result) => {
// 			if (!err) {
// 				return res.status(200).send({
// 					errorCode: 0,
// 					data: result,
// 					message: 'succesfull',
// 					errors: [],
// 				});
// 			}
// 		},
// 		next,
// 	);
// };

// exports.importContractFile = (req, res, next) => {
// 	const { file } = req;
// 	var data = { ...req.params, file };
// 	console.log('log of data from importContractFile: ', data);

// 	UseCase.importContractFile(
// 		data,
// 		(err, result) => {
// 			if (!err) {
// 				return res.status(201).send({
// 					errorCode: 0,
// 					data: result,
// 					message: 'succesfull',
// 					errors: [],
// 				});
// 			}
// 		},
// 		next,
// 	);
// };

// exports.importDepositTermFile = (req, res, next) => {
// 	const { file } = req;
// 	var data = { ...req.params, file };
// 	console.log('log of data from importDepositTermFile: ', data);

// 	UseCase.importDepositTermFile(
// 		data,
// 		(err, result) => {
// 			if (!err) {
// 				return res.status(201).send({
// 					errorCode: 0,
// 					data: result,
// 					message: 'succesfull',
// 					errors: [],
// 				});
// 			}
// 		},
// 		next,
// 	);
// };

// exports.getDepositTermFile = (req, res, next) => {
// 	var data = req.params;
// 	console.log('log of data from getDepositTermFile: ', data);

// 	UseCase.getDepositTermFile(
// 		data,
// 		(err, result) => {
// 			if (!err) {
// 				return res.status(200).send({
// 					errorCode: 0,
// 					data: result,
// 					message: 'succesfull',
// 					errors: [],
// 				});
// 			}
// 		},
// 		next,
// 	);
// };

// exports.getInvoicesPaymentStatus = asyncHandler(async (req, res) => {
// 	const data = { ...req.params, ...req.query };
// 	console.log('log of getInvoicesPaymentStatus', data);
// 	const result = await UseCase.getInvoicesPaymentStatus(data.buildingId, data.month, data.year);
// 	return new SuccessResponse('Success', result).send(res);
// });

// exports.getRevenues = asyncHandler(async (req, res) => {
// 	const data = { ...req.params, ...req.query };
// 	console.log('log of getRevenues', data);
// 	const result = await UseCase.getRevenues(data);
// 	return new SuccessResponse('Success', result).send(res);
// });

exports.getStatistics = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getStatistics', data);
	const result = await UseCase.getStatistics(data.buildingId, Number(data.month), Number(data.year));
	return new SuccessResponse('Success', result).send(res);
});

exports.getBuildingPermissions = asyncHandler(async (req, res) => {
	const data = req.user;
	console.log('log of getBuildingPermissions', data);
	const result = await UseCase.getBuildingPermissions(data._id);
	return new SuccessResponse('Success', result).send(res);
});

exports.setBuildingPermission = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of setBuildingPermission', data);
	const result = await UseCase.setBuildingPermission(data.buildingId, data.type, data.enabled);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getStatisticGeneral = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getStatisticGeneral', data);
	const result = await UseCase.getStatisticGeneral(data.buildingId, data.year);
	return new SuccessResponse('Success', result).send(res);
});
