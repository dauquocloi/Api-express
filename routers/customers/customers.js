const asyncHandler = require('../../utils/asyncHandler');
const delay = require('../../utils/delay');
const { SuccessResponse, SuccessMsgResponse, FileResponse } = require('../../utils/apiResponse');
const UseCase = require('../../data_providers/customers');

exports.getAllCustomers = asyncHandler(async (req, res) => {
	let data = req.query;
	console.log('log of data from getAllCustomers: ', data);
	// await delay(5000, true);
	const result = await UseCase.getAllCustomers(data.buildingId, data.status);
	return new SuccessResponse('Success', result).send(res);
});

exports.editCustomer = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from editCustomer: ', data);
	await UseCase.editCustomer(data, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.addCustomer = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from addCustomer: ', req.body);
	await UseCase.addCustomer(data, req.redisKey, req.user._id);
	return new SuccessMsgResponse('Success').send(res);
});

exports.setCustomerStatus = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from setStatusCustomer: ', data);
	await UseCase.setCustomerStatus(data.customerId, data.status, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getListSelectingCustomer = asyncHandler(async (req, res) => {
	let data = req.query;
	console.log('log of getListSelectingCustomer', data);
	const result = await UseCase.getListSelectingCustomer(data.roomId);
	return new SuccessResponse('Success', result).send(res);
});

exports.changeContractOwner = asyncHandler(async (req, res) => {
	console.log('log of data from changeContractOwner: ', req.params);
	const result = await UseCase.changeContractOwner(req.params.customerId, req.redisKey);
	console.log('log of result from changeContractOwner: ', result);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteCustomer = asyncHandler(async (req, res) => {
	console.log('log of data from deleteCustomer: ', req.params);
	await UseCase.deleteCustomer(req.params.customerId, req.user._id);
	return new SuccessMsgResponse('Success').send(res);
});

exports.exportCT01PdfFile = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of exportCT01PdfFile', data);
	const result = await UseCase.exportCT01PdfFile(data.customerId);
	return new FileResponse(result, 'application/pdf', 'Success').send(res);
});
