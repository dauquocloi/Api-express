const UseCase = require('../../data_providers/deposits');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessMsgResponse, SuccessResponse, FileResponse } = require('../../utils/apiResponse');
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.getDeposits = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of getDeposits', data);
	const result = await UseCase.getDeposits(data.buildingId);

	return new SuccessResponse('Success', result).send(res);
});

exports.createDeposit = asyncHandler(async (req, res) => {
	const { room, customer, interiors, fees, roomId, contractPeriod } = req.body;
	const data = { room, customer, interiors, fees, roomId, contractPeriod };
	console.log('log of data from createDeposit: ', data);

	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			room: room,
			customer: customer,
			interiors: interiors,
			fees: fees,
			roomId: roomId,
			// receiptId: receiptId,
			contractPeriod: contractPeriod,
		}),
		resourceId: roomId,
		execute: () => UseCase.createDepositV2(data),
	});

	return new SuccessResponse('Success', result).send(res);
});

exports.getDepositDetail = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('this is log of getDepositDetail: ', data);
	const result = await UseCase.getDepositDetail(data.depositId, req.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyDeposit = asyncHandler(async (req, res) => {
	const { depositId } = req.params;
	const { room, customer, version, fees, interiors } = req.body;
	const data = {
		depositId,
		room,
		customer,
		version,
		fees,
		interiors,
	};
	console.log('this is log of modifyDeposit: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			depositId: depositId,
			room: room,
			customer: customer,
			version: version,
			fees: fees,
			interiors: interiors,
		}),
		resourceId: depositId,
		execute: () => UseCase.modifyDeposit(data),
	});
	return new SuccessMsgResponse('Success').send(res);
});

exports.uploardDepositTerm = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.file };
	console.log('this is log of uploardDepositTerm: ', data);
	await UseCase.uploardDepositTerm(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.cancelDeposit = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('this is log of cancelDeposit: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			depositId: data.depositId,
			version: data.version,
		}),
		resourceId: data.depositId,
		execute: () => UseCase.cancelDeposit(data.depositId, data.version, req.user._id),
	});
	return new SuccessMsgResponse('Success').send(res);
});

exports.terminateDeposit = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('this is log of terminateDeposit: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			depositId: data.depositId,
			version: data.version,
		}),
		resourceId: data.depositId,
		execute: () => UseCase.terminateDeposit({ depositId: data.depositId, version: data.version }),
	});
	return new SuccessMsgResponse('Success').send(res);
});

exports.getPreviewDepositDocument = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('this is log of getPreviewDepositDocument: ', data);
	const result = await UseCase.getPreviewDepositDocument({ depositId: data.depositId });
	return new FileResponse(result, 'application/pdf', 'Success').send(res);
});
