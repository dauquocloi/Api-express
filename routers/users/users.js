const UseCase = require('../../data_providers/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

global.config = require('../../config');

exports.getAll = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('This is log of data from getAll', data);
	const result = await UseCase.getAll(data);
	return new SuccessResponse('Success', result).send(res);
});

// exports.create = (req, res, next) => {
// 	var data = req.body;
// 	console.log('this is log of req user create:', data);

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

// exports.register = async (req, res) => {
// 	var data = req.body;
// 	// mã hóa Mật Khẩu
// 	encryptedPassword = await bcrypt.hash(data.password, 5);
// 	data.password = encryptedPassword;
// 	console.log(data.password);
// 	UseCase.getEmail(data, (err, result) => {
// 		if (result === null) {
// 			UseCase.create(data, (err, result) => {
// 				if (err) {
// 					return res.status(204).send({
// 						errorCode: 0,
// 						data: {},
// 						message: 'created fail',
// 						errors: [],
// 					});
// 				} else {
// 					return res.status(201).send({
// 						errorCode: 0,
// 						data: result,
// 						message: 'succesfull created',
// 						errors: [],
// 					});
// 				}
// 			});
// 		} else {
// 			// trả về cho client
// 			return res.status(200).send({
// 				errorCode: 0,
// 				data: [],
// 				message: 'khứa này có rồi',
// 				errors: [],
// 			});
// 		}
// 	});
// }

// exports.modifyPassword = async (req, res, next) => {
// 	let data = { ...req.body, ...req.params };

// 	UseCase.modifyPassword(
// 		data,
// 		(err, result) => {
// 			if (!err) {
// 				return res.status(200).send({
// 					errorCode: 0,
// 					message: 'Change password success',
// 					errors: [],
// 				});
// 			}
// 		},
// 		next,
// 	);
// };

exports.modifyManagementInfo = asyncHandler(async (req, res) => {
	let data = { ...req.body, ...req.params };
	console.log('log of data from modifyUserInfo: ', data);
	await UseCase.modifyManagementInfo(req.body, req.params.userId, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getAllManagers = asyncHandler(async (req, res) => {
	let data = req.user;
	console.log('log of data from getAllManagers: ', data);
	const result = await UseCase.getAllManagers(data._id);
	return new SuccessResponse('Success', result).send(res);
});

exports.removeManager = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from removeManager: ', data);
	await UseCase.removeManager(data.userId);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getListSelectionManagements = asyncHandler(async (req, res) => {
	let data = req.user;
	console.log('log of data from getAllManagement: ', data);
	const result = await UseCase.getListSelectionManagements(data._id);
	return new SuccessResponse('Success', result).send(res);
});

exports.createManagement = asyncHandler(async (req, res) => {
	let data = req.body;
	console.log('log of data from createManagement: ', data);
	await UseCase.create(data, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.modifyUserPermission = asyncHandler(async (req, res) => {
	let data = { ...req.body, ...req.params };
	console.log('log of data from modifyUserPermission: ', data);
	await UseCase.modifyUserPermission(data.userId, data.newPermission, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.checkManagerCollectedCash = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from checkManagerCollectedCash: ', data);
	const result = await UseCase.checkManagerCollectedCash(data.userId);
	return new SuccessResponse('Success', result).send(res);
});

exports.changeUserBuildingManagement = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from changeUserBuildingManagement: ', data);
	await UseCase.changeUserBuildingManagement(data, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.addDevice = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from addDevice: ', data);
	await UseCase.addDevice(req.user._id, data.deviceId, data.platform, data.expoPushToken, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});
