const UseCase = require('../../data_providers/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const { client: redis } = require('../../config').redisDb;
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

// global.config = require('../../config');

exports.getAll = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('This is log of data from getAll', data);
	const result = await UseCase.getAll(data);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyManagementInfo = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	const { buildingIds, fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, gender, role } = req.body;
	const data = {
		userId,
		buildingIds,
		fullName,
		phone,
		dob,
		cccd,
		cccdIssueDate,
		cccdIssueAt,
		permanentAddress,
		gender,
		role,
	};
	console.log('log of data from modifyUserInfo: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			userId: userId,
			buildingIds: buildingIds,
			fullName: fullName,
			phone: phone,
			dob: dob,
			cccd: cccd,
			cccdIssueDate: cccdIssueDate,
			cccdIssueAt: cccdIssueAt,
			permanentAddress: permanentAddress,
			gender: gender,
			role: role,
		}),
		resourceId: userId,
		execute: () => UseCase.modifyManagementInfo(data),
	});
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
	// console.log('log of data from getAllManagement: ', data);
	const result = await UseCase.getListSelectionManagements(data._id);
	return new SuccessResponse('Success', result).send(res);
});

exports.createManagement = asyncHandler(async (req, res) => {
	const { buildingIds, fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, gender, role } = req.body;
	const data = {
		buildingIds,
		fullName: fullName.trim(),
		phone: phone.trim(),
		dob,
		cccd,
		cccdIssueDate,
		cccdIssueAt,
		permanentAddress: permanentAddress.trim(),
		gender,
		role,
	};
	console.log('log of data from createManagement: ', data);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			buildingIds: buildingIds,
			fullName: fullName,
			phone: phone,
			dob: dob,
			cccd: cccd,
			cccdIssueDate: cccdIssueDate,
			cccdIssueAt: cccdIssueAt,
			permanentAddress: permanentAddress,
			gender: gender,
			role: role,
		}),
		resourceId: req.user._id,
		execute: () => UseCase.create(data),
	});
	return new SuccessResponse('Success', result).send(res);
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
	const { userId } = req.params;
	const { buildingIds, role } = req.body;
	const data = {
		userId,
		buildingIds,
		role,
	};
	console.log('log of data from changeUserBuildingManagement: ', data);
	await UseCase.changeUserBuildingManagement(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.addDevice = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from addDevice: ', data);
	await UseCase.addDevice(req.user._id, data.deviceId, data.platform, data.expoPushToken);
	return new SuccessMsgResponse('Success').send(res);
});

exports.setNotification = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of data from setNotification: ', data);
	const result = await UseCase.setNotification(req.user._id, data.type, data.enabled);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyUserInfo = asyncHandler(async (req, res) => {
	const { fullName, phone, dob, cccd, cccdIssueDate, cccdIssueAt, permanentAddress, gender } = req.body;
	const data = {
		userId: req.user._id,
		fullName: fullName.trim(),
		phone: phone.trim(),
		dob,
		cccd,
		cccdIssueDate,
		cccdIssueAt,
		permanentAddress: permanentAddress.trim(),
		gender,
	};
	console.log('log of data from modifyUserInfo: ', data);
	const result = await UseCase.modifyUserInfo(data);

	return new SuccessResponse('Success', result).send(res);
});
