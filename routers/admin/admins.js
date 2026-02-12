const UseCase = require('../../data_providers/admin');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

exports.importBuilding = asyncHandler(async (req, res) => {
	const data = { ...req.body, ...req.files };
	console.log('log of data from importBuilding: ', req.files);
	const result = await UseCase.buildings.importBuilding(data);
	return new SuccessResponse('Import building successfully', result).send(res);
});

exports.importRooms = asyncHandler(async (req, res) => {
	const data = { ...req.body, roomFile: req.file };
	console.log('log of data from importBuilding: ', req.file);
	await UseCase.rooms.importRooms(data);
	return new SuccessMsgResponse('Import rooms successfully').send(res);
});

exports.importFirstStatistic = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of data from importBuilding: ', req.file);
	await UseCase.statistics.importFirstStatistics(data);
	return new SuccessMsgResponse('Import first statistic successfully').send(res);
});

exports.getAllBanks = asyncHandler(async (req, res) => {
	const result = await UseCase.banks.getAll();
	return new SuccessResponse('Success', result).send(res);
});

exports.getUserDetail = asyncHandler(async (req, res) => {
	const data = req.query;
	const result = await UseCase.users.getUserDetail(data.phone);
	return new SuccessResponse('Success', result).send(res);
});

exports.importPaymentInfo = asyncHandler(async (req, res) => {
	const data = { ...req.body, ...req.params };
	console.log('log of importPaymentInfo', data);
	const result = await UseCase.buildings.importPaymentInfo(data.buildingId, data.bankAccountId);
	return new SuccessMsgResponse('Success').send(res);
});

exports.createBankAccount = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of createBank', data);
	const result = await UseCase.bankAccounts.importBankAccount(data.userId, data.accountNumber, data.accountName, data.bankId, data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getBuildingsByUserId = asyncHandler(async (req, res) => {
	const result = await UseCase.buildings.getBuildingsByUserId(req.query.userId);
	return new SuccessResponse('Success', result).send(res);
});
