var DataProvider = require('../data_providers/customers');

exports.getAll = (data, cb) => {
	DataProvider.getAll(data, (err, result) => {
		if (err) {
			cb(err, null);
		} else {
			cb(null, result);
		}
	});
};

exports.getById = (data, cb) => {
	DataProvider.getById(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};
