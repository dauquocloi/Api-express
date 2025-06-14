var DataProvider = require('../data_providers/customers');

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

exports.getCustomerById = (data, cb, next) => {
	DataProvider.getCustomerById(
		data,
		(errs, result) => {
			if (errs) {
				cb(errs, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.editCustomer = (data, cb, next) => {
	DataProvider.editCustomer(
		data,
		(errs, result) => {
			if (errs) {
				cb(errs, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.addCustomer = (data, cb, next) => {
	DataProvider.addCustomer(
		data,
		(errs, result) => {
			if (errs) {
				cb(errs, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.setCustomerStatus = (data, cb, next) => {
	DataProvider.setCustomerStatus(
		data,
		(errs, result) => {
			if (errs) {
				cb(errs, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.getCustomerLeaved = (data, cb, next) => {
	DataProvider.getCustomerLeaved(data, cb, next);
};
