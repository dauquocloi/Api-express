const UseCase = require('../../data_providers/fees');
const listFeeInitial = require('../../utils/getListFeeInital');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');

exports.addFee = asyncHandler(async (req, res, next) => {
	const roomId = req.params.roomId;
	const feeKey = req.body.feeKey.toString();
	const feeAmount = Number(req.body.feeAmount);
	const result = await UseCase.addFee(roomId, feeKey, feeAmount);
	return new SuccessResponse('Success', result).send(res);
});

exports.deleteFee = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from deleteFee: ', data);
	await UseCase.deleteFee(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.editFee = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from editFee: ', data);
	await UseCase.editFee(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getFeeInitial = (req, res) => {
	const FeeInitial = listFeeInitial;
	return new SuccessResponse('Success', FeeInitial).send(res);
};
