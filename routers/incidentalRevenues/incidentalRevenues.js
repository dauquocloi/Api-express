const UseCase = require('../../data_providers/incidentalRevenues');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

exports.createIncidentalRevenue = asyncHandler(async (req, res) => {
	const { amount, content, collector, date, buildingId } = req.body;
	const data = {
		amount: NUmber(amount),
		content: content.trim(),
		collector,
		date,
		buildingId,
		userId: req.user._id,
	};
	console.log('log of createRevenue: ', data);
	const result = await UseCase.createIncidentalRevenue(data);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyIncidentalRevenue = asyncHandler(async (req, res) => {
	const { incidentalRevenueId } = req.params;
	const { amount, content, collector, date, version, image } = req.body;
	const data = {
		incidentalRevenueId,
		amount: Number(amount),
		content: content.trim() || '',
		collector,
		date,
		version,
		image,
		userId: req.user._id,
	};
	console.log('log of data from modifyRevenue: ', data);
	await UseCase.modifyIncidentalRevenue(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteIncidentalRevenue = asyncHandler(async (req, res) => {
	const { incidentalRevenueId } = req.params;
	const { version } = req.body;
	const data = {
		incidentalRevenueId,
		version,
		userId: req.user._id,
	};
	console.log('log of deleteRevenue: ', data);
	await UseCase.deleteIncidentalRevenue(data);
	return new SuccessMsgResponse('Success').send(res);
});
