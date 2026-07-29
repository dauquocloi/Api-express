let UseCase = require('../../data_providers/depositRefunds');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { client: redis } = require('../../config').redisDb;

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
	const data = { ...req.body, ...req.params };
	console.log('log of data from generateDepositRefund: ', data);
	const result = await UseCase.generateDepositRefund2({
		contractId: data.contractId,
		roomVersion: data.roomVersion,
		feeIndexValues: data.feeIndexValues,
		feesOther: data.feesOther,
		userId: req.user._id,
	});
	await redis.set(req.redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyDepositRefund = asyncHandler(async (req, res) => {
	let data = { ...req.body, ...req.params };
	console.log('log of modifyDepositRefund data:', data);
	await UseCase.modifyDepositRefund(data, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.confirmDepositRefund = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.user };
	console.log('log of data from submitDepositRefund: ', data);
	const result = await UseCase.confirmDepositRefund(data.depositRefundId, req.user._id, req.redisKey);
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
