const UseCase = require('../../data_providers/incidentalRevenues');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.createIncidentalRevenue = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body, ...req.user };
	console.log('log of createRevenue: ', data);
	const result = await UseCase.createIncidentalRevenue(data.amount, data.content, data._id, data.date, data.buildingId, req.redisKey);
	await delay(5000);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyIncidentalRevenue = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from modifyRevenue: ', data);
	await UseCase.modifyIncidentalRevenue(data, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteIncidentalRevenue = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of deleteRevenue: ', data);
	await UseCase.deleteIncidentalRevenue(data);
	return new SuccessMsgResponse('Success').send(res);
});
