const UseCase = require('../../data_providers/payments');
const { SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getTransactionManager } = require('../../instance');
const { TRANS_STATUS } = require('../../constants/transactions');

exports.collectCashFromEmployee = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.user };
		console.log('log of collectCashFromEmployee', data);
		UseCase.collectCashFromEmployee(
			data,
			(err, result) => {
				if (!err) {
					return res.status(200).send({
						errorCode: 0,
						message: 'succesfull',
						data: result,
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

exports.testSocket = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of testSocket', data);

	const transaction = getTransactionManager();
	transaction.broadcast({
		type: 'receipt',
		// id:
		payload: {
			status: TRANS_STATUS['PROCESSING'],
			message: 'Hoá đơn mới được tạo',
			metadata: {},
		},
	});
	setTimeout(() => {
		transaction.broadcast(data.receiptId, {
			status: TRANS_STATUS['SUCCESS'],
			message: 'Hoá đơn mới được tạo',
			metadata: {},
		});
	}, 3000);
	return new SuccessMsgResponse('Success').send(res);
});

exports.weebhookPayment = asyncHandler(async (req, res) => {
	const sepayData = req.body;
	console.log('log of weebhookPayment', sepayData);
	const result = await UseCase.weebhookPayment(sepayData);
	return res.status(200).send({ success: true, errorCode: 0, message: 'succesfull' });
});
