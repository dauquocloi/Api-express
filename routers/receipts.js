const UseCase = require('../cores/receipts');

exports.createReceipt = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.body };
		UseCase.createReceipt(
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

exports.createDepositReceipt = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.body };
		UseCase.createDepositReceipt(
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

exports.getListReceiptPaymentStatus = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.query };
		console.log('log of listReceiptPaymentStatus', data);
		UseCase.getListReceiptPaymentStatus(
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

exports.getReceiptDetail = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.query };
		console.log('log of getReceiptDetail', data);
		UseCase.getReceiptDetail(
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

exports.collectCashMoney = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.body, ...req.user };
		console.log('log of collectCashMoney', data);
		UseCase.collectCashMoney(
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

exports.deleteReceipt = (req, res, next) => {
	try {
		const data = req.params;
		console.log('log of deleteReceipt', data);
		UseCase.deleteReceipt(
			data,
			(err, result) => {
				if (!err) {
					return res.status(204).json({
						errorCode: 0,
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
