const UseCase = require('../../data_providers/transactions');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { client: redis } = require('../../config').redisDb;

exports.confirmTransaction = asyncHandler(async (req, res) => {
	const result = await UseCase.confirmTransaction(req.params.transactionId, req.redisKey);
	await redis.set(req.redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
	return new SuccessResponse('Success', result).send(res);
});

exports.declineTransaction = asyncHandler(async (req, res) => {
	const data = { ...req.body, ...req.params };
	const result = await UseCase.denyTransaction(data.transactionId, data.reason, data.buildingId, data.version);
	await redis.set(req.redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
	return new SuccessResponse('Success', result).send(res);
});

exports.receiveCashFromManager = asyncHandler(async (req, res) => {
	const result = await UseCase.receiveCashFromManager(req.params.transactionId, req.redisKey);
	console.log('log of result: ', result);
	return new SuccessResponse('Success', result).send(res);
});
