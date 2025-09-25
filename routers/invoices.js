const UseCase = require('../cores/invoices');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');
const fs = require('fs');
const path = require('path');
const { generateQrCode } = require('../utils/generateQrCode');

const JWT_SECRET = '82371923sdasdads[]sdsadasd';

exports.getAll = (req, res, next) => {
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

exports.getFeeForGenerateInvoice = (req, res, next) => {
	var data = { ...req.params, ...req.query };
	console.log('This is log of req.params from getFeeForGenerateInvoice', data);
	UseCase.getFeeForGenerateInvoice(
		data,
		(err, result) => {
			if (err) {
				return res.status(500).send({
					errorCode: 1,
					data: err.message,
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
		},
		next,
	);
};

exports.create = (req, res, next) => {
	var data = req.body;
	console.log('This is log of invoice create req.body', req.body);

	UseCase.create(
		data,
		(err, result) => {
			if (err) {
				console.log('log error from router: ', err.message);
				return res.status(500).send({
					errorCode: 1,
					data: {},
					message: err.message || 'Lỗi khi tạo hóa đơn', // Đảm bảo trả về thông báo lỗi rõ ràng
					errors: [],
				});
			} else {
				return res.status(201).send({
					errorCode: 0,
					data: result,
					message: 'succesfull created',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.update = (req, res, next) => {
	var data = req.body;
	console.log('This is log of invoice update req.body', req.body);
	UseCase.update(data, (err, result) => {
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

exports.getInvoiceStatus = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.query };

		console.log('log of data from getInvoiceStatus: ', data);

		UseCase.getInvoiceStatus(
			data,
			(err, result) => {
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
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.getInvoicesPaymentStatus = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.query };

		console.log('log of data from getInvoicesPaymentStatus: ', data);

		UseCase.getInvoicesPaymentStatus(
			data,
			(err, result) => {
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
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.getInvoiceDetail = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.query };

		console.log('log of data from getInvoiceDetail: ', data);

		UseCase.getInvoiceDetail(
			data,
			(err, result) => {
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
			},
			next,
		);
	} catch (error) {
		next(error);
	}
};

exports.generateFirstInvoice = (req, res, next) => {
	try {
		const data = req.body;
		console.log('log of data from generateFirstInvoice: ', data);
		UseCase.generateFirstInvoice(
			data,
			(err, result) => {
				if (!err) {
					return res.status(201).send({
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

exports.collectCashMoney = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.body, ...req.user };
		console.log('log of data from collectCashMoney: ', data);

		UseCase.collectCashMoney(
			data,
			(err, result) => {
				if (!err) {
					return res.status(201).send({
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

exports.getInvoiceInfoByInvoiceCode = (req, res, next) => {
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
