const UseCase = require('../cores/debts');

exports.deleteDebts = (req, res, next) => {
	var data = req.params;
	console.log('log of data from deleteDebts: ', data);

	UseCase.deleteDebts(
		data,
		(err, result) => {
			if (!err) {
				return res.status(201).send({
					errorCode: 0,
					message: result,
					errors: [],
				});
			}
		},
		next,
	);
};

exports.getCreateDepositRefundInfo = (req, res, next) => {
	var data = { ...req.params, ...req.query };
	console.log('log of data from get debs receipt unpaid: ', data);

	UseCase.getCreateDepositRefundInfo(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					errors: [],
				});
			}
		},
		next,
	);
};
