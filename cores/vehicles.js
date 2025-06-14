var DataProvider = require('../data_providers/vehicles');

exports.getAll = (data, cb, next) => {
	DataProvider.getAll(
		data,
		(err, result) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.editVehicle = (data, cb, next) => {
	DataProvider.editVehicle(
		data,
		(err, result) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.addVehicle = (data, cb, next) => {
	DataProvider.addVehicle(
		data,
		(err, result) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.getVehicle = (data, cb, next) => {
	DataProvider.getVehicle(
		data,
		(err, result) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};
