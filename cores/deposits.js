var DataProvider = require('../data_providers/deposits');

exports.createDeposit = (data, cb, next) => {
	DataProvider.createDeposit(data, cb, next);
};

exports.getListDeposits = (data, cb, next) => {
	DataProvider.getListDeposits(data, cb, next);
};

exports.getDepositDetail = (data, cb, next) => {
	DataProvider.getDepositDetail(data, cb, next);
};
