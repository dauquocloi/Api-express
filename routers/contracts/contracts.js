const UseCase = require('../../data_providers/contracts');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

exports.prepareGenerateContract = asyncHandler(async (req, res) => {
	let data = req.body;
	console.log('log of data from prepareGenerateContract: ', data);
	const result = await UseCase.prepareGenerateContract(
		data.roomId,
		data.buildingId,
		req.user._id,
		data.finance,
		data.fees,
		data.interiors,
		data.customers,
		data.contractPeriod,
		data.note,
		data.stayDays,
		req.redisKey,
	);
	return new SuccessResponse('Success', result).send(res);
});

exports.generateContract = asyncHandler(async (req, res) => {
	let data = req.body;
	console.log('log of data from create: ', data);
	await UseCase.generateContract(data.contractDraftId, req.user._id, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getContractPdfSignedUrl = asyncHandler(async (req, res) => {
	let data = req.query;
	console.log('log of data from getContractPdfSignedUrl: ', data);
	const result = await UseCase.getContractPdfSignedUrl(data.contractCode);
	return new SuccessResponse('Success', result).send(res);
});

exports.setExpectedMoveOutDate = asyncHandler(async (req, res) => {
	let data = { ...req.body, ...req.params };
	console.log('log of data from setExpectedMoveOutDate: ', data);
	await UseCase.setExpectedMoveOutDate(data.contractId, data.expectedMoveOutDate);
	return SuccessMsgResponse('Success').send(res);
});

exports.cancelIsEarlyTermination = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from cancelIsEarlyTermination: ', data);
	await UseCase.cancelIsEarlyTermination(data.contractId, data.roomId, req.redisKey);
	return SuccessMsgResponse('Success').send(res);
});

exports.terminateContractUnRefund = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from terminateContractUnRefund: ', data);
	await UseCase.terminateContractUnRefund(data.contractId, req.redisKey);
	return SuccessMsgResponse('Success').send(res);
});

exports.getContractPdfUrlByCustomerPhone = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of data from getContractPdfUrlByCustomerPhone: ', data);
	const result = await UseCase.getContractPdfUrlByCustomerPhone(data.phone);
	console.log('log of result from getContractPdfUrlByCustomerPhone: ', result);
	return new SuccessResponse('Success', result).send(res);
});

exports.contractExtention = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from contractExtention: ', data);
	await UseCase.contractExtention(data.contractId, data.extentionDate, data.newRent, data.newDepositAmount, data.version, req.redisKey);
	return SuccessMsgResponse('Success').send(res);
});

// exports.terminateContractUnRefund = async
