let UseCase = require('../../data_providers/depositRefunds');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

exports.getDepositRefunds = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of getDepositRefunds', data);
	const result = await UseCase.getDepositRefunds(data.buildingId, data.mode);
	return new SuccessResponse('Success', result).send(res);
});

// exports.getAllDepositRefunds = (req, res, nexy) => {
// 	let data = { ...req.params, ...req.query };
// 	console.log('log of data from getAllDepositRefunds: ', data);

// 	UseCase.getAllDepositRefunds(data, (err, result) => {
// 		if (!err) {
// 			return res.status(200).send({
// 				errorCode: 0,
// 				data: result,
// 				message: 'success',
// 				errors: [],
// 			});
// 		}
// 	});
// };

exports.getDepositRefundDetail = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from getDepositRefund: ', data);
	const result = await UseCase.getDepositRefundDetail(data.depositRefundId);
	return new SuccessResponse('Success', result).send(res);
});

exports.generateDepositRefund = asyncHandler(async (req, res) => {
	const data = { ...req.body, ...req.params };
	console.log('log of data from generateDepositRefund: ', data);
	const result = await UseCase.generateDepositRefund({
		contractId: data.contractId,
		roomVersion: data.roomVersion,
		feeIndexValues: data.feeIndexValues,
		feesOther: data.feesOther,
		userId: req.user._id,
		redisKey: req.redisKey,
	});
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
