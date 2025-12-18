const UseCase = require('../../data_providers/debts');
const { SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

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
