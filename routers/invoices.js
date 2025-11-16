const UseCase = require('../cores/invoices');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { result } = require('underscore');
const fs = require('fs');
const path = require('path');
const { generateQrCode } = require('../utils/generateQrCode');
const { validateGenerateInvoice } = require('../utils/validator');

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

exports.create = (req, res, next) => {
	const { error, value } = validateGenerateInvoice({ ...req.body, ...req.params });
	console.log('Log of data from createInvoice', value);

	if (error) {
		console.error('Log of error from createInvoice', error);
		return res.status(400).send({
			errorCode: 40000,
			message: 'Dữ liệu đầu vào không hợp lệ',
			errors: error.details.map((err) => err.message),
		});
	}

	UseCase.create(
		value,
		(err, result) => {
			if (result) {
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
				if (!err) {
					setTimeout(
						() =>
							res.status(200).send({
								errorCode: 0,
								data: result,
								message: 'succesfull',
								errors: [],
							}),
						2000,
					);
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
					setTimeout(
						() =>
							res.status(201).send({
								errorCode: 0,
								data: result,
								message: 'succesfull',
								errors: [],
							}),
						2000,
					);
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

exports.modifyInvoice = (req, res, next) => {
	// const { error, value } = validateGenerateInvoice({ ...req.body, ...req.params });
	// console.log('Log of data from modifyInvoice', value);

	// if (error) {
	// 	console.error('Log of error from modifyInvoice', error);
	// 	return res.status(400).send({
	// 		errorCode: 40000,
	// 		message: 'Dữ liệu đầu vào không hợp lệ',
	// 		errors: error.details.map((err) => err.message),
	// 	});
	// }

	let data = { ...req.params, ...req.body };
	console.log('log of data from modifyInvoice: ', data);
	UseCase.modifyInvoice(
		data,
		(err, result) => {
			if (result) {
				return res.status(200).send({
					errorCode: 0,
					message: 'succesfully',
					errors: [],
				});
			}
		},
		next,
	);
};

exports.deleteInvoice = (req, res, next) => {
	let data = req.params;
	console.log('log of data from deleteInvoice: ', data);
	UseCase.deleteInvoice(data, (err, result) => {
		if (result) {
			return res.status(200).send({
				errorCode: 0,
				message: 'succesfully',
				errors: [],
			});
		}
	});
};
