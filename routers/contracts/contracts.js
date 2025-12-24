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
	);
	return new SuccessResponse('Success', result).send(res);
});

exports.generateContract = asyncHandler(async (req, res) => {
	let data = req.body;
	console.log('log of data from create: ', data);
	await UseCase.generateContract(data.contractDraftId);
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
	await UseCase.cancelIsEarlyTermination(data.contractId, data.roomId);
	return SuccessMsgResponse('Success').send(res);
});

exports.terminateContractUnRefund = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from terminateContractUnRefund: ', data);
	await UseCase.terminateContractUnRefund(data.contractId);
	return SuccessMsgResponse('Success').send(res);
});

// exports.terminateContractUnRefund = async
