var DataProvider = require('../data_providers/buildings');

exports.getAll = (data, cb) => {
	DataProvider.getAll(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, { result });
		}
	});
};

exports.create = (data, cb, next) => {
	DataProvider.create(data, cb, next);
};

exports.createBuilding = (data, cb) => {
	DataProvider.createBuilding(data, cb);
};

exports.getEmail = (data, cb) => {
	DataProvider.getEmail(data, (errs, result) => {
		if (errs) {
			console.log(errs);
			cb(errs, null);
		} else {
			console.log('đã chọc đến đây');

			cb(null, { data: result });
		}
	});
};
