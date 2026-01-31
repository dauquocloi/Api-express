const UseCase = require('../../data_providers/transactions');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

exports.confirmTransaction = asyncHandler(async (req, res) => {
	const result = await UseCase.confirmTransaction(req.params.transactionId, req.redisKey);
	return new SuccessResponse('Success', result).send(res);
});

exports.declineTransaction = asyncHandler(async (req, res) => {
	const result = await UseCase.denyTransaction(req.params.transactionId, req.body.reason, req.redisKey);
	console.log('log of result: ', result);
	return new SuccessResponse('Success', result).send(res);
});

exports.receiveCashFromManager = asyncHandler(async (req, res) => {
	const result = await UseCase.receiveCashFromManager(req.params.transactionId, req.redisKey);
	console.log('log of result: ', result);
	return new SuccessResponse('Success', result).send(res);
});
