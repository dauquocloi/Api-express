const UseCase = require('../../data_providers/revenues');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

exports.getRevenues = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getRevenues', data);
	const result = await UseCase.getRevenues(data);
	return new SuccessResponse('Success', result).send(res);
});

exports.createIncidentalRevenue = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body, ...req.user };
	console.log('log of createRevenue: ', data);
	const result = await UseCase.createIncidentalRevenue(data.amount, data.content, data._id, data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyIncidentalRevenue = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from modifyRevenue: ', data);
	await UseCase.modifyIncidentalRevenue(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteIncidentalRevenue = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of deleteRevenue: ', data);
	await UseCase.deleteIncidentalRevenue(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getTotalFeeRevenue = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of getTotalFeeRevenue: ', data);
	const result = await UseCase.getTotalFeeRevenue(data);
	return new SuccessResponse('Success', result).send(res);
});
