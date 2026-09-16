const UseCase = require('../../data_providers/invoices');
const asyncHandler = require('../../utils/asyncHandler');
const { generateQrCode } = require('../../utils/generateQrCode');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const { NotFoundError } = require('../../AppError');
const { executeIdempotent } = require('../../utils/idempotent');
const generateRequestHash = require('../../utils/generateRequestHash');

exports.getInvoicesPaymentStatus = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of data from getInvoicesPaymentStatus: ', data);
	const result = await UseCase.getInvoicesPaymentStatus(data.buildingId, Number(data.month), Number(data.year));
	return new SuccessResponse('Success', result).send(res);
});

exports.getInvoiceSendingStatus = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of data from getInvoiceSendingStatus: ', data);
	const result = await UseCase.getInvoiceSendingStatus(data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getInvoiceDetail = asyncHandler(async (req, res) => {
	const data = { ...req.params };
	console.log('log of data from getInvoiceDetail: ', data);
	// await new Promise((resolve, reject) => setTimeout(() => reject(new NotFoundError()), 5000));
	const result = await UseCase.getInvoiceDetail(data.invoiceId, req.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyInvoice = asyncHandler(async (req, res) => {
	const { feeIndexValues, stayDays, version } = req.body;
	const { invoiceId } = req.params;
	const data = {
		invoiceId,
		feeIndexValues,
		stayDays,
		version,
		userId: req.user._id,
	};
	console.log('log of data from modifyInvoice: ', data);
	const result = await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			invoiceId: data.invoiceId,
			feeIndexValues: data.feeIndexValues,
			stayDays: data.stayDays,
			version: data.version,
		}),
		resourceId: data.invoiceId,
		execute: () => UseCase.modifyInvoice(data),
	});
	return new SuccessResponse('Success', result).send(res);
});

exports.deleteInvoice = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from deleteInvoice: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			invoiceId: data.invoiceId,
			version: data.version,
		}),
		resourceId: data.invoiceId,
		execute: () => UseCase.deleteInvoice(data.invoiceId, req.user._id, data.version),
	});

	return new SuccessMsgResponse('Success').send(res);
});

exports.checkout = asyncHandler(async (req, res) => {
	// const data = { ...req.params, ...req.body };
	const { invoiceId } = req.params;
	const { buildingId, date, amount, version, paymentMethod } = req.body;
	const data = {
		invoiceId,
		buildingId,
		date: date ? new Date(date) : new Date(),
		amount: Number(amount),
		version,
		userId: req.user._id,
		paymentMethod,
		idempotencyKey: req.get('Idempotency-Key'),
		collectorInfo: { _id: req.user._id, role: req.user.role },
	};
	console.log('log of data from checkout Invoice: ', data);

	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			invoiceId: data.invoiceId,
			buildingId: data.buildingId,
			date: data.date,
			amount: data.amount,
			version: data.version,
			paymentMethod: data.paymentMethod,
		}),
		resourceId: data.invoiceId,
		execute: () => UseCase.checkout(data),
	});
	return new SuccessMsgResponse('Success').send(res);
});

exports.createInvoice = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from createInvoice: ', data);
	await executeIdempotent({
		key: req.get('Idempotency-Key'),
		userId: req.user._id,
		endPoint: `${req.method}:${req.route.path}`,
		requestHash: generateRequestHash({
			roomId: data.roomId,
			buildingId: data.buildingId,
			stayDays: data.stayDays,
			feeIndexValues: data.feeIndexValues,
			version: data.roomVersion,
		}),
		resourceId: data.roomId,
		execute: () => UseCase.createInvoice(data.roomId, data.buildingId, data.stayDays, data.feeIndexValues, req.user._id, data.roomVersion),
	});
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteDebts = asyncHandler(async (req, res) => {
	await UseCase.deleteDebts(req.params.invoiceId);
	return new SuccessMsgResponse('Success').send(res);
});
