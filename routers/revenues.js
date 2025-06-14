const UseCase = require('../cores/revenues');

exports.createIncidentalRevenue = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.body };
		console.log('log of createRevenue: ', data);
		UseCase.createIncidentalRevenue(
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

exports.modifyIncidentalRevenue = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.body };
		console.log('log of data from modifyRevenue: ', data);
		UseCase.modifyIncidentalRevenue(
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

exports.deleteIncidentalRevenue = (req, res, next) => {
	try {
		const data = req.params;
		console.log('log of deleteRevenue: ', data);
		UseCase.deleteIncidentalRevenue(
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

exports.getFeeRevenueDetail = (req, res, next) => {
	try {
		const data = { ...req.params, ...req.query };
		console.log('log of getFeeRevenueDetail: ', data);
		UseCase.getFeeRevenueDetail(
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
