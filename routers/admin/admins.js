const UseCase = require('../../data_providers/admin');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.importBuilding = asyncHandler(async (req, res) => {
	const { buildingName, buildingAddress, roomQuantity, invoiceNotes, ownerId, companyId, paymentConfirmationMode } = req.body;

	const { contractDocxUrl, contractPdfUrl, depositTermUrl } = req.files;
	const data = {
		buildingName: buildingName.trim(),
		buildingAddress: buildingAddress.trim(),
		roomQuantity: Number(roomQuantity),
		invoiceNotes: invoiceNotes.trim(),
		contractDocxUrl,
		contractPdfUrl,
		depositTermUrl,
		ownerId,
		companyId,
		paymentConfirmationMode,
	};
	console.log('log of data from importBuilding: ', data);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			buildingName: data.buildingName,
			buildingAddress: data.buildingAddress,
			roomQuantity: data.roomQuantity,
			invoiceNotes: data.invoiceNotes,
			contractDocxUrl: data.contractDocxUrl,
			contractPdfUrl: data.contractPdfUrl,
			depositTermUrl: data.depositTermUrl,
			ownerId: data.ownerId,
			companyId: data.companyId,
			paymentConfirmationMode: data.paymentConfirmationMode,
		}),
		resourceId: data.companyId,
		execute: () => UseCase.buildings.importBuilding(data),
	});

	return new SuccessResponse('Import building successfully', result).send(res);
});

exports.importRooms = asyncHandler(async (req, res) => {
	const roomFile = req.file;
	// console.log('log of roomFile: ', roomFile);
	const { buildingId, ownerId } = req.body;
	const data = {
		roomFile,
		buildingId,
		ownerId,
	};
	console.log('log of data from importRooms: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			buildingId: data.buildingId,
			ownerId: data.ownerId,
		}),
		resourceId: data.buildingId,
		execute: () => UseCase.rooms.importRooms(data),
	});
	return new SuccessMsgResponse('Import rooms successfully').send(res);
});

exports.importFirstStatistic = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of data from importBuilding: ', data);
	await UseCase.statistics.importFirstStatistics(data);
	return new SuccessMsgResponse('Import first statistic successfully').send(res);
});

exports.getAllBanks = asyncHandler(async (req, res) => {
	const result = await UseCase.banks.getAll();
	return new SuccessResponse('Success', result).send(res);
});

exports.importPaymentInfo = asyncHandler(async (req, res) => {
	const data = { ...req.body, ...req.params };
	console.log('log of importPaymentInfo', data);
	const result = await UseCase.buildings.importPaymentInfo(data.buildingId, data.bankAccountId);
	return new SuccessResponse('Success', result).send(res);
});

exports.createBankAccount = asyncHandler(async (req, res) => {
	const { buildingId, accountNumber, accountName, bankId, ownerId } = req.body;
	const data = {
		ownerId: ownerId,
		buildingId,
		accountNumber: accountNumber.trim(),
		accountName: accountName.trim(),
		bankId,
	};
	console.log('log of createBank', data);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			ownerId: data.ownerId,
			buildingId: data.buildingId,
			accountNumber: data.accountNumber,
			accountName: data.accountName,
			bankId: data.bankId,
		}),
		resourceId: data.buildingId,
		execute: () => UseCase.bankAccounts.importBankAccount(data),
	});

	return new SuccessResponse('Success', result).send(res);
});

exports.getBuildingsByUserId = asyncHandler(async (req, res) => {
	const result = await UseCase.buildings.getBuildingsByUserId(req.query.userId);
	return new SuccessResponse('Success', result).send(res);
});

exports.importBank = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of importBank', data);
	const result = await UseCase.banks.importBank({
		brandName: data.brandName,
		fullName: data.fullName,
		shortName: data.shortName,
		code: data.code,
		bin: data.bin,
		logoPath: data.logoPath,
		iconPath: data.iconPath,
		active: data.active,
	});
	return new SuccessResponse('Success', result).send(res);
});
