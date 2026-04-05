const UseCase = require('../../data_providers/buildings');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse, XlsxResponse } = require('../../utils/apiResponse');

exports.getAll = asyncHandler(async (req, res) => {
	const data = req.user;
	const result = await UseCase.getAll(data._id);

	return new SuccessResponse('Success', result).send(res);
});

exports.getRooms = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('This is log of rooms/getall', req.params);
	// await new Promise((resolve, reject) => {
	// 	// Thay vì throw, ta dùng reject
	// 	reject(new Error('Lỗi sau 5 giây!'));
	// });

	const rooms = await UseCase.getRooms(data);
	return new SuccessResponse('Success', rooms).send(res);
});

exports.getBillCollectionProgress = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from getBillCollectionProgress: ', data);
	const result = await UseCase.getBillCollectionProgress(data);
	return new SuccessResponse('Success', result).send(res);
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

exports.getStatistics = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getStatistics', data);
	const result = await UseCase.getStatistics(data.buildingId, data.month, data.year);
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
	await new Promise((resolve, reject) => setTimeout(() => reject(new Error('Lỗi lấy thống kê !')), 5000)); // Giả lập delay 5 giây
	const result = await UseCase.getStatisticGeneral(data.buildingId, data.year);
	return new SuccessResponse('Success', result).send(res);
});

exports.getDepositTermFile = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of getDepositTermFile', data);
	const result = await UseCase.getDepositTermFile(data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.financeSettlement = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of financeSettlement', data);
	await UseCase.financeSettlement(data.buildingId, req.user._id);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getPrepareFinanceSettlementData = asyncHandler(async (req, res) => {
	const result = await UseCase.prepareFinanceSettlement(req.params.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getContractTermUrl = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of getContractTermUrl', data);
	const result = await UseCase.getContractTermUrl(data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getBuildingReportXlsx = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getBuildingReportXlsx', data);
	const workbook = await UseCase.getBuildingReportXlsx(data.buildingId, data.month, data.year);
	new XlsxResponse(workbook, `report.xlsx`).send(res);
});
