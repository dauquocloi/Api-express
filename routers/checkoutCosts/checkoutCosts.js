const UseCase = require('../../data_providers/checkoutCosts');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.getCheckoutCost = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from getCheckoutCost: ', data);
	const result = await UseCase.getCheckoutCostDetail(data.checkoutCostId, req.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getModifyCheckoutCostInfo = asyncHandler(async (req, res) => {
	console.log('log of data from getModifyCheckoutCostInfo: ', req.params);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			checkoutCostId: req.params.checkoutCostId,
		}),
		resourceId: req.params.checkoutCostId,
		execute: () => UseCase.getModifyCheckoutCostInfo(req.params.checkoutCostId),
	});
	return new SuccessResponse('Success', result).send(res);
});

exports.removeDebtsFromCheckoutCost = asyncHandler(async (req, res) => {
	console.log('log of data from removeDebtsFromCheckoutCost: ', req.params);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			checkoutCostId: req.params.checkoutCostId,
		}),
		resourceId: req.params.checkoutCostId,
		execute: () => UseCase.removeDebtsFromCheckoutCost(req.params.checkoutCostId),
	});
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyCheckoutCost = asyncHandler(async (req, res) => {
	const { checkoutCostId } = req.params;
	const { version, feeIndexValues, stayDays, feesOther } = req.body;

	const data = {
		checkoutCostId,
		version,
		feeIndexValues,
		stayDays,
		feesOther,
		userId: req.user._id,
	};
	console.log('log of data from modifyCheckoutCost: ', data);

	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			checkoutCostId,
			version,
			feeIndexValues,
			stayDays,
			feesOther,
		}),
		resourceId: checkoutCostId,
		execute: () => UseCase.modifyCheckoutCost(data),
	});

	return new SuccessResponse('Success', result).send(res);
});

exports.terminateCheckoutCost = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from terminateCheckoutCost: ', data);
	await UseCase.terminateCheckoutCost(data.checkoutCostId, data.version);
	return new SuccessMsgResponse('Success').send(res);
});

exports.generateCheckoutCost = asyncHandler(async (req, res) => {
	const { roomId, contractId, feeIndexValues, feesOther, stayDays, roomVersion } = req.body;
	const data = {
		roomId,
		contractId,
		feeIndexValues,
		feesOther,
		stayDays,
		roomVersion,
		userId: req.user._id,
	};
	console.log('log of data from generateCheckoutCost: ', data);

	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			roomId,
			contractId,
			feeIndexValues,
			feesOther,
			stayDays,
			roomVersion,
		}),
		resourceId: roomId,
		execute: () => UseCase.generateCheckoutCost(data),
	});
	return new SuccessResponse('Success', result).send(res);
});
