let DataProvider = require('../data_providers/fees');

exports.addFee = (data, cb, next) => {
	DataProvider.addFee(
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

exports.deleteFee = (data, cb, next) => {
	DataProvider.deleteFee(
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

exports.editFee = (data, cb, next) => {
	DataProvider.editFee(
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
