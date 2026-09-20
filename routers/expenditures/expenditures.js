const UseCase = require('../../data_providers/expenditures');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const executeIdempotent = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.getExpenditures = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of getExpenditures', data);
	const result = await UseCase.getExpenditures(data.buildingId, Number(data.month), Number(data.year));
	return new SuccessResponse('Success', result).send(res);
});

exports.createExpenditure = asyncHandler(async (req, res) => {
	const { buildingId, spender, amount, type, content, date } = req.body;
	const data = {
		buildingId,
		spender,
		amount: Number(amount),
		type,
		content: content.trim(),
		date,
	};
	console.log('this is log of createExpenditure', data);
	await UseCase.createExpenditure(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.modifyExpenditure = asyncHandler(async (req, res) => {
	const { expenditureId } = req.params;
	const { spender, amount, content, date, type, version } = req.body;
	const data = {
		expenditureId,
		spender,
		amount: Number(amount),
		content: content.trim(),
		date,
		type,
		version,
	};
	console.log('this is log of modifyExpenditure', data);

	await UseCase.modifyExpenditure(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteExpenditure = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('this is log of deleteExpenditure', data);

	await UseCase.deleteExpenditure(data);
	return new SuccessMsgResponse('Success').send(res);
});
