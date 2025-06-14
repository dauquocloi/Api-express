var DataProvider = require('../data_providers/transactions');

exports.collectCashFromEmployee = (data, cb, next) => {
	DataProvider.collectCashFromEmployee(data, cb, next);
};
