const UseCase = require('../../data_providers/transactions');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { client: redis } = require('../../config').redisDb;
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.confirmTransaction = asyncHandler(async (req, res) => {
	const result = await UseCase.confirmTransaction(req.params.transactionId, req.redisKey);
	return new SuccessResponse('Success', result).send(res);
});

exports.declineTransaction = asyncHandler(async (req, res) => {
	const data = { ...req.body, ...req.params };
	console.log('log of data from declineTransaction: ', data);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			transactionId: data.transactionId,
			reason: data.reason,
			buildingId: data.buildingId,
			version: data.version,
		}),
		resourceId: data.transactionId,

		execute: () => UseCase.denyTransaction(data.transactionId, data.reason, data.buildingId, data.version, req.user._id),
	});
	return new SuccessResponse('Success', result).send(res);
});

exports.receiveCashFromManager = asyncHandler(async (req, res) => {
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			transactionId: req.params.transactionId,
		}),
		resourceId: req.params.transactionId,

		execute: () => UseCase.receiveCashFromManager(req.params.transactionId),
	});
	return new SuccessResponse('Success', result).send(res);
});
