const UseCase = require('../../data_providers/expenditures');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');

exports.getExpenditures = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of getExpenditures', data);
	const result = await UseCase.getExpenditures(data.buildingId, data.month, data.year);
	return new SuccessResponse('Success', result).send(res);
});

exports.createExpenditure = asyncHandler(async (req, res) => {
	var data = { ...req.body, ...req.params };
	console.log('this is log of createExpenditure', data);
	await UseCase.createExpenditure(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.modifyExpenditure = asyncHandler(async (req, res) => {
	var data = { ...req.body, ...req.params };
	console.log('this is log of modifyExpenditure', data);

	await UseCase.modifyExpenditure(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteExpenditure = asyncHandler(async (req, res) => {
	var data = { ...req.params, ...req.body };
	console.log('this is log of deleteExpenditure', data);

	await UseCase.deleteExpenditure(data);
	return new SuccessMsgResponse('Success').send(res);
});
