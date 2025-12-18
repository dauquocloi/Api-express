const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const UseCase = require('../../data_providers/customers');

exports.getAllCustomers = asyncHandler(async (req, res) => {
	let data = req.query;
	console.log('log of data from getAllCustomers: ', data);
	const result = await UseCase.getAllCustomers(data.buildingId, data.status);
	return new SuccessResponse('Success', result).send(res);
});

exports.editCustomer = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from editCustomer: ', data);
	await UseCase.editCustomer(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.addCustomer = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from addCustomer: ', req.body);
	await UseCase.addCustomer(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.setCustomerStatus = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from setStatusCustomer: ', data);
	await UseCase.setCustomerStatus(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getListSelectingCustomer = asyncHandler(async (req, res) => {
	let data = req.query;
	console.log('log of getListSelectingCustomer', data);
	const result = await UseCase.getListSelectingCustomer(data.roomId);
	return new SuccessResponse('Success', result).send(res);
});
