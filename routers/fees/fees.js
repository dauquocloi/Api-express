const UseCase = require('../../data_providers/fees');
const listFeeInitial = require('../../utils/getListFeeInital');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.addFee = asyncHandler(async (req, res) => {
	const { roomId, feeKey, feeAmount, lastIndex } = req.body;
	const data = {
		roomId,
		feeKey,
		feeAmount: Number(feeAmount),
		lastIndex,
		userId: req.user._id,
	};
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			roomId: roomId,
			feeKey,
			feeAmount,
			lastIndex,
		}),
		resourceId: data.roomId,
		execute: () => UseCase.addFee(data),
	});
	return new SuccessResponse('Success', result).send(res);
});

exports.deleteFee = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from deleteFee: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			feeId: data.feeId,
		}),
		resourceId: data.feeId,
		execute: () => UseCase.deleteFee(data.feeId, req.user._id),
	});
	return new SuccessMsgResponse('Success').send(res);
});

exports.editFee = asyncHandler(async (req, res) => {
	const { feeId } = req.params;
	const { roomId, feeAmount, lastIndex, version } = req.body;
	const data = {
		feeId,
		roomId,
		feeAmount: Number(feeAmount),
		lastIndex,
		version,
	};
	console.log('log of data from editFee: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			feeId: data.feeId,
			roomId,
			feeAmount,
			lastIndex,
			version,
		}),
		resourceId: data.feeId,
		execute: () => UseCase.editFee(data),
	});

	return new SuccessMsgResponse('Success').send(res);
});

exports.getFeeInitial = (req, res) => {
	const FeeInitial = listFeeInitial.filter((f) => f.feeKey !== 'SPEC100PH');
	return new SuccessResponse('Success', FeeInitial).send(res);
};

exports.getFeeIndexHistory = asyncHandler(async (req, res) => {
	console.log('log of data from getFeeIndexHistory: ', req.params);
	const result = await UseCase.getFeeIndexHistory(req.params.feeId);

	return new SuccessResponse('Success', result).send(res);
});

exports.getFeeIndexRecords = asyncHandler(async (req, res) => {
	const { feeId } = req.params;
	const { roomId } = req.query;
	const data = {
		feeId,
		roomId,
	};
	console.log('log of data from getFeeIndexRecords: ', data);
	const result = await UseCase.getFeeIndexRecords({ roomId: data.roomId, feeId: data.feeId });
	return new SuccessResponse('Success', result).send(res);
});
