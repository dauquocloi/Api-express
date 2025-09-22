var DataProvider = require('../data_providers/buildings');

exports.getAll = (data, cb, next) => {
	DataProvider.getAll(
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

exports.getBankStatus = (data, cb, next) => {
	DataProvider.getBankStatus(data, cb, next);
};

exports.getBuildingContract = (data, cb, next) => {
	DataProvider.getBuildingContract(data, cb, next);
};

exports.importContractFile = (data, cb, next) => {
	DataProvider.importContractFile(data, cb, next);
};

exports.importDepositTermFile = (data, cb, next) => {
	DataProvider.importDepositTermFile(data, cb, next);
};

exports.getDepositTermFile = (data, cb, next) => {
	DataProvider.getDepositTermFile(data, cb, next);
};
