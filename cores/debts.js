const DataProvider = require('../data_providers/debts');

exports.deleteDebts = (data, cb, next) => {
	DataProvider.deleteDebts(data, cb, next);
};

exports.getDebtsByRoomId = (data, cb, next) => {
	DataProvider.getDebtsByRoomId(data, cb, next);
};
