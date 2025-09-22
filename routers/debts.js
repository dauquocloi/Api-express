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

exports.getDebtsByRoomId = (req, res, next) => {
	var data = req.params;
	console.log('log of data from getDebtsByRoomId: ', data);

	UseCase.getDebtsByRoomId(
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
