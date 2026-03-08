const UseCase = require('../../data_providers/fees');
const listFeeInitial = require('../../utils/getListFeeInital');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');

exports.addFee = asyncHandler(async (req, res, next) => {
	let data = req.body;
	console.log('log of data from addFee: ', data);
	const result = await UseCase.addFee(data.roomId, data.feeKey, Number(data.feeAmount), req.redisKey, req.user._id);
	return new SuccessResponse('Success', result).send(res);
});

exports.deleteFee = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from deleteFee: ', data);
	await UseCase.deleteFee(data.feeId, req.user._id);
	return new SuccessMsgResponse('Success').send(res);
});

exports.editFee = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from editFee: ', data);
	await UseCase.editFee(
		data.feeId,
		data.roomId,
		req.user._id,

		Number(data.feeAmount),
		data.lastIndex,
		data.version,
		req.redisKey,
	);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getFeeInitial = (req, res) => {
	const FeeInitial = listFeeInitial;
	return new SuccessResponse('Success', FeeInitial).send(res);
};

exports.getFeeIndexHistory = asyncHandler(async (req, res) => {
	const result = await UseCase.getFeeIndexHistory(req.params.feeId);
	setTimeout(() => {
		return new SuccessResponse('Success', result).send(res);
	}, 1000);
});
