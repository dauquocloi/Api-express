const UseCase = require('../../data_providers/receipts');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { sendNotification } = require('../../utils/notificationUtils');

exports.getListReceiptPaymentStatus = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getListReceiptPaymentStatus', data);
	const result = await UseCase.getListReceiptPaymentStatus(data.buildingId, Number(data.month), Number(data.year));
	return new SuccessResponse('Success', result).send(res);
});

exports.createReceipt = asyncHandler(async (req, res) => {
	const data = { ...req.query, ...req.body };
	console.log('log of data from createReceipt', data);
	const result = await UseCase.createReceipt(data.roomId, data.buildingId, data.receiptAmount, data.receiptContent, data.date, req.user._id);
	return new SuccessResponse('Success', result).send(res);
});

exports.createDepositReceipt = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of createDepositReceipt req.body: ', data);
	await UseCase.createDepositReceipt(data.roomId, data.buildingId, data.amount, data.payer);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getReceiptDetail = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getReceiptDetail', data);
	const result = await UseCase.getReceiptDetail(data.receiptId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getDepositReceiptDetail = asyncHandler(async (req) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getReceiptDetail', data);
	const result = await UseCase.getDepositReceiptDetail(data.receiptId);
	return new SuccessResponse('Success', result).send(res);
});

exports.collectCashMoney = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body, ...req.user, redisKey: req.redisKey };
	console.log('log of collectCashMoney', data);
	await UseCase.collectCashMoney(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteReceipt = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of deleteReceipt', data);
	await UseCase.deleteReceipt(data.receiptId, req.user._id);
	return new SuccessMsgResponse('Success').send(res);
});

exports.createDebtsReceipt = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from createDebtsReceipt: ', data);
	const result = await UseCase.createDebtsReceipt(data);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyReceipt = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from modifyReceipt: ', data);
	await UseCase.modifyReceipt(data.receiptId, data.amount, data.receiptContent, req.user._id);
	return new SuccessMsgResponse('Success').send(res);
});
