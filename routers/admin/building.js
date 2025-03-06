const UseCase = require('../../cores/buildings');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.createBuilding = (req, res, next) => {
	var data = req.params;
	console.log('log of data from createBulding: ', data);
	UseCase.createBuilding(data, (err, result) => {
		if (err) {
			return next(err);
		} else {
			return res.status(201).send({
				errorCode: 0,
				data: result,
				message: 'succesfull created',
				errors: [],
			});
		}
	});
};
