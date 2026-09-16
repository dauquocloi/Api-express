const UseCase = require('../../data_providers/receipts');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { client: redis } = require('../../config').redisDb;
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.getListReceiptPaymentStatus = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getListReceiptPaymentStatus', data);
	const result = await UseCase.getListReceiptPaymentStatus(data.buildingId, Number(data.month), Number(data.year));
	return new SuccessResponse('Success', result).send(res);
});

exports.createReceipt = asyncHandler(async (req, res) => {
	const { receiptAmount, receiptContent, date, roomId } = req.body;

	const receiptData = {
		roomId: roomId,
		receiptAmount: Number(receiptAmount),
		receiptContent: receiptContent?.trim() || '',
		date: date ? new Date(date) : new Date(),
		userId: req.user._id,
	};

	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			roomId: receiptData.roomId,
			receiptAmount: receiptData.amount,
			receiptContent: receiptData.content,
		}),
		resourceId: receiptData.roomId,
		execute: () => UseCase.createReceipt(receiptData),
	});

	return new SuccessResponse('Success', result).send(res);
});

exports.createDepositReceipt = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of createDepositReceipt req.body: ', data);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			roomId: data.roomId,
			buildingId: data.buildingId,
			amount: data.amount,
			payer: data.payer,
			version: data.roomVersion,
		}),
		resourceId: data.roomId,
		execute: () => UseCase.createDepositReceipt(data.roomId, data.buildingId, data.amount, data.payer, req.user._id, data.roomVersion),
	});
	// await redis.set(req.redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
	return new SuccessResponse('Success', result).send(res);
});

exports.getReceiptDetail = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of getReceiptDetail', data);
	const result = await UseCase.getReceiptDetail(data.receiptId, req.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getDepositReceiptDetail = asyncHandler(async (req) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getReceiptDetail', data);
	const result = await UseCase.getDepositReceiptDetail(data.receiptId);
	return new SuccessResponse('Success', result).send(res);
});

// exports.collectCashMoney = asyncHandler(async (req, res) => {
// 	const data = { ...req.params, ...req.body, ...req.user, redisKey: req.redisKey };
// 	console.log('log of collectCashMoney', data);
// 	await UseCase.collectCashMoney(data.receiptId, data.buildingId, data.amount, data.date, data._id, data.version, data.redisKey);
// 	return new SuccessMsgResponse('Success').send(res);
// });

exports.checkout = asyncHandler(async (req, res) => {
	const { receiptId } = req.params;
	const { amount, date, version, paymentMethod } = req.body;

	const data = {
		receiptId: receiptId,
		amount: Number(amount),
		date: date ? new Date(date) : new Date(),
		collectorInfo: {
			_id: req.user._id,
			role: req.user.role,
		},
		version,
		idempotencyKey: req.get('Idempotence-Key'),
		paymentMethod,
	};

	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			receiptId: receiptId,
			amount,
			date,
			version,
		}),
		resourceId: receiptId,
		execute: () => UseCase.checkout(data),
	});

	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteReceipt = asyncHandler(async (req, res) => {
	const data = {
		receiptId: req.params.receiptId,
		version: req.body.version,
		userId: req.user._id,
	};
	console.log('log of deleteReceipt', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			receiptId: data.receiptId,
			version: data.version,
		}),
		resourceId: data.receiptId,
		execute: () => UseCase.deleteReceipt(data),
	});

	return new SuccessMsgResponse('Success').send(res);
});

exports.createDebtsReceipt = asyncHandler(async (req, res) => {
	const { roomId, receiptContent, date } = req.body;
	const data = {
		roomId,
		receiptContent: receiptContent?.trim() || '',
		date: date ? new Date(date) : new Date(),
		userId: req.user._id,
	};
	console.log('log of data from createDebtsReceipt: ', data);

	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			roomId: roomId,
			receiptContent: receiptContent,
			date: date,
		}),
		resourceId: roomId,
		execute: () => UseCase.createDebtsReceipt(data),
	});

	return new SuccessResponse('Success', result).send(res);
});

exports.modifyReceipt = asyncHandler(async (req, res) => {
	const { amount, receiptContent, version, date } = req.body;
	const { receiptId } = req.params;
	const data = {
		receiptId,
		newReceiptAmount: Number(amount),
		receiptContent: receiptContent?.trim() || '',
		date: date ? new Date(date) : null,
		userId: req.user._id,
		version,
	};
	console.log('log of data from modifyReceipt: ', data);

	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			receiptId: receiptId,
			amount: amount,
			receiptContent: receiptContent,
			date: date,
			version: version,
		}),
		resourceId: receiptId,
		execute: () => UseCase.modifyReceipt(data),
	});
	return new SuccessMsgResponse('Success').send(res);
});
