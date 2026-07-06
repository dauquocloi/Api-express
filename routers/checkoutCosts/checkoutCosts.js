const UseCase = require('../../data_providers/checkoutCosts');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

exports.getCheckoutCost = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from getCheckoutCost: ', data);
	const result = await UseCase.getCheckoutCostDetail(data.checkoutCostId, req.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getModifyCheckoutCostInfo = asyncHandler(async (req, res) => {
	console.log('log of data from getModifyCheckoutCostInfo: ', req.params);
	const result = await UseCase.getModifyCheckoutCostInfo(req.params.checkoutCostId);
	return new SuccessResponse('Success', result).send(res);
});

exports.removeDebtsFromCheckoutCost = asyncHandler(async (req, res) => {
	console.log('log of data from removeDebtsFromCheckoutCost: ', req.params);
	const result = await UseCase.removeDebtsFromCheckoutCost(req.params.checkoutCostId);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyCheckoutCost = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from modifyCheckoutCost: ', data);
	const result = await UseCase.modifyCheckoutCost(
		data.checkoutCostId,
		data.version,
		data.feeIndexValues,
		data.stayDays,
		data.feesOther,
		req.user._id,
	);
	return new SuccessResponse('Success', result).send(res);
});

exports.terminateCheckoutCost = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from terminateCheckoutCost: ', data);
	await UseCase.terminateCheckoutCost(data.checkoutCostId, data.version);
	return new SuccessMsgResponse('Success').send(res);
});

exports.generateCheckoutCost = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from generateCheckoutCost: ', data);
	const result = await UseCase.generateCheckoutCost({
		roomId: data.roomId,
		contractId: data.contractId,
		creatorId: req.user._id,
		feeIndexValues: data.feeIndexValues,
		feesOther: data.feesOther,
		stayDays: data.stayDays,
		roomVersion: data.roomVersion,
	});
	return new SuccessResponse('Success', result).send(res);
});
