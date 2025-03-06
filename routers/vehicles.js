const UseCase = require('../cores/vehicles');

exports.getAll = (req, res, next) => {
	var data = req.params;
	console.log(req.params);
	UseCase.getAll(data, (err, result) => {
		if (err) {
			return res.status(500).send({
				errorCode: 1,
				data: {},
				message: err.message,
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
