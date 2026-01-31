const asyncHandler = require('../../utils/asyncHandler');
const UseCase = require('../../data_providers/clients');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

exports.getContractInfo = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of data from customerGetContractInfo: ', data);
	const result = await UseCase.getContractInfo(data.contractCode);
	return new SuccessResponse('Success', result).send(res);
});

exports.getBillInfo = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of data from getBillInfo: ', data);
	const result = await UseCase.getInvoiceInfoByInvoiceCode(data.billCode);
	return new SuccessResponse('Success', result).send(res);
});

exports.confirmationContract = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from confirmationContract: ', data);
	await UseCase.confirmationContract(data.contractId, data.otp);
	return new SuccessMsgResponse('Success').send(res);
});

exports.requestConfirmContractOtp = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from requestConfirmContractOrp: ', data);
	await UseCase.requestConfirmContractOtp(data.contractId);
	return new SuccessMsgResponse('Success').send(res);
});
