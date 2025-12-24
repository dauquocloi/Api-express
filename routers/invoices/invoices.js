const UseCase = require('../../data_providers/invoices');
const asyncHandler = require('../../utils/asyncHandler');
const { generateQrCode } = require('../../utils/generateQrCode');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

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
	const data = { ...req.params, ...req.query };
	console.log('log of data from getInvoiceDetail: ', data);
	const result = await UseCase.getInvoiceDetail(data.invoiceId, data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyInvoice = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from modifyInvoice: ', data);
	await UseCase.modifyInvoice(data.invoiceId, data.feeIndexValues, data.stayDays, data.version);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteInvoice = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from deleteInvoice: ', data);
	await UseCase.deleteInvoice(data.invoiceId, data.roomVersion, req.user._id);
	return new SuccessMsgResponse('Success').send(res);
});

exports.collectCashMoney = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body, ...req.user };
	await UseCase.collectCashMoney(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.createInvoice = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body, ...req.user };
	console.log('log of data from createInvoice: ', data);
	await UseCase.createInvoice(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.deleteDebts = asyncHandler(async (req, res) => {
	await UseCase.deleteDebts(req.params.invoiceId);
	return new SuccessMsgResponse('Success').send(res);
});

//========================UN REFACTED========================//
exports.getAll = (req, res) => {
	var data = req.params;
	console.log('This is log of req.query', req.params);
	UseCase.getAll(data, (err, result) => {
		if (err) {
			return res.status(204).send({
				errorCode: 0,
				data: {},
				message: 'err',
				errors: [],
			});
		} else {
			return res.status(200).send({
				errorCode: 0,
				data: result,
				message: 'succesfull',
				errors: [],
			});
		}
	});
};

exports.getFeeForGenerateInvoice = (req, res) => {
	var data = req.params;
	console.log('This is log of req.params from getFeeForGenerateInvoice', data);
	UseCase.getFeeForGenerateInvoice(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'succesfull',
					errors: [],
				});
			}
		},
		next,
	);
};

//not used
// exports.update = (req, res) => {
// 	var data = req.body;
// 	console.log('This is log of invoice update req.body', req.body);
// 	UseCase.update(data, (err, result) => {
// 		if (err) {
// 			return res.status(204).send({
// 				errorCode: 0,
// 				data: {},
// 				message: 'err',
// 				errors: [],
// 			});
// 		} else {
// 			return res.status(200).send({
// 				errorCode: 0,
// 				data: result,
// 				message: 'succesfull',
// 				errors: [],
// 			});
// 		}
// 	});
// };

// not used
// exports.getInvoiceStatus = (req, res) => {
// 	try {
// 		const data = { ...req.params, ...req.query };

// 		console.log('log of data from getInvoiceStatus: ', data);

// 		UseCase.getInvoiceStatus(
// 			data,
// 			(err, result) => {
// 				if (!err) {
// 					return res.status(200).send({
// 						errorCode: 0,
// 						data: result,
// 						message: 'succesfull',
// 						errors: [],
// 					});
// 				}
// 			},
// 			next,
// 		);
// 	} catch (error) {
// 		next(error);
// 	}
// };

exports.generateFirstInvoice = (req, res) => {
	try {
		const data = req.body;
		console.log('log of data from generateFirstInvoice: ', data);
		UseCase.generateFirstInvoice(
			data,
			(err, result) => {
				if (!err) {
					res.status(201).send({
						errorCode: 0,
						data: result,
						message: 'succesfull',
						errors: [],
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.getInvoiceInfoByInvoiceCode = (req, res) => {
	try {
		const data = req.params;
		console.log('log of data from getInvoiceInfoByInvoiceCode: ', data);

		UseCase.getInvoiceInfoByInvoiceCode(
			data,
			async (err, result) => {
				if (result) {
					const { bankId, shortName } = result.transferInfo ?? {};
					const { paymentContent } = result;
					const amount = result.type === 'receipt' ? result.amount : result.total;

					const qrCode = await generateQrCode(bankId, shortName, amount, paymentContent);
					let qrBase64;
					if (!qrCode) {
						qrBase64 = null;
					} else {
						const buffer = await qrCode.arrayBuffer();
						const nodeBuffer = Buffer.from(buffer);
						qrBase64 = `data:image/png;base64,${nodeBuffer.toString('base64')}`;
					}

					return res.status(200).send({
						errorCode: 0,
						data: { ...result, qrBase64 },
						message: 'succesfull',
						errors: [],
					});
				} else {
					return res.status(err.status).send({
						errorCode: err.status,
						message: err.message,
					});
				}
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};
