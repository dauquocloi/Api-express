var DataProvider = require('../data_providers/users');

exports.getAll = (data, cb) => {
	DataProvider.getAll(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, { count: 5, data: result });
		}
	});
};

exports.create = (data, cb) => {
	DataProvider.create(data, cb);
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

exports.getEmailbyToken = (data, cb) => {
	DataProvider.getEmailbyToken(data, (errs, result) => {
		if (errs) {
			console.log(errs);
			cb(errs, null);
		} else {
			console.log('đã chọc đến EmailbyToken');
			console.log({ result });
			cb(null, { result });
		}
	});
};
