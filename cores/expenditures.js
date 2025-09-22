var DataProvider = require('../data_providers/expenditures');

exports.createExpenditure = (data, cb, next) => {
	DataProvider.createExpenditure(data, cb, next);
};

exports.modifyExpenditure = (data, cb, next) => {
	DataProvider.modifyExpenditure(data, cb, next);
};

exports.deleteExpenditure = (data, cb, next) => {
	DataProvider.deleteExpenditure(data, cb, next);
};
