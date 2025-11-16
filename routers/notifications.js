const UseCase = require('../cores/notifications');

exports.getNotifications = (req, res, next) => {
	const data = { ...req.user, ...req.query };

	UseCase.getNotifications(
		data,
		(err, result) => {
			if (!err) {
				return res.status(200).send({
					errorCode: 0,
					data: result,
					message: 'success',
					errors: [],
				});
			}
		},
		next,
	);
};
