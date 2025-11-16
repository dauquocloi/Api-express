const DataProvider = require('../data_providers/debts');

exports.deleteDebts = (data, cb, next) => {
	DataProvider.deleteDebts(data, cb, next);
};

exports.getCreateDepositRefundInfo = (data, cb, next) => {
	DataProvider.getCreateDepositRefundInfo(data, cb, next);
};
