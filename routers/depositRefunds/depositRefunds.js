let UseCase = require('../../data_providers/depositRefunds');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { client: redis } = require('../../config').redisDb;
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.getDepositRefunds = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of getDepositRefunds', data);
	const result = await UseCase.getDepositRefunds(data.buildingId, data.mode);
	return new SuccessResponse('Success', result).send(res);
});

exports.getDepositRefundDetail = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from getDepositRefund: ', data);
	const result = await UseCase.getDepositRefundDetail(data.depositRefundId);
	return new SuccessResponse('Success', result).send(res);
});

exports.generateDepositRefund = asyncHandler(async (req, res) => {
	const { contractId, roomVersion, feeIndexValues, feesOther, debtsData, stayDays } = req.body;
	const data = {
		contractId,
		roomVersion,
		feeIndexValues,
		feesOther,
		userId: req.user._id,
		debtsData,
		stayDays,
	};
	console.log('log of data from generateDepositRefund: ', data);

	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			contractId,
			roomVersion,
			feeIndexValues,
			feesOther,
			stayDays: stayDays,
		}),
		resourceId: contractId,
		execute: () => UseCase.generateDepositRefund(data),
	});
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyDepositRefund = asyncHandler(async (req, res) => {
	const { depositRefundId } = req.params;
	const { feesOther, feeIndexValues, stayDays, debtsData, version } = req.body;
	const data = {
		depositRefundId,
		feesOther,
		feeIndexValues,
		stayDays,
		debtsData,
		version,
		userId: req.user._id,
	};
	console.log('log of modifyDepositRefund data:', data);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			depositRefundId,
			feesOther,
			feeIndexValues,
			stayDays,
			debtsData,
			version,
		}),
		resourceId: depositRefundId,
		execute: () => UseCase.modifyDepositRefund(data),
	});
	return new SuccessResponse('Success', result).send(res);
});

exports.confirmDepositRefund = asyncHandler(async (req, res) => {
	const image = req.file;
	const data = {
		spenderId: req.user._id,
		version: req.body.version,
		depositRefundId: req.params.depositRefundId,
		image,
	};
	console.log('Log of data from confirmDepositRefund: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			depositRefundId: data.depositRefundId,
			version: data.version,
		}),
		resourceId: req.params.depositRefundId,
		execute: () => UseCase.confirmDepositRefund(data),
	});

	return new SuccessMsgResponse('Success').send(res);
});

exports.removeDebtsFromDepositRefund = asyncHandler(async (req, res) => {
	const result = await UseCase.removeDebtsFromDepositRefund(req.params.depositRefundId);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getModifyDepositRefundInfo = asyncHandler(async (req, res) => {
	const result = await UseCase.getModifyDepositRefundInfo(req.params.depositRefundId);
	return new SuccessResponse('Success', result).send(res);
});
