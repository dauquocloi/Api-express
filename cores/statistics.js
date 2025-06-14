var DataProvider = require('../data_providers/statistics');

exports.getRevenues = (data, cb, next) => {
	DataProvider.getRevenues(data, cb, next);
};

exports.getExpenditures = (data, cb, next) => {
	DataProvider.getExpenditures(data, cb, next);
};

exports.getStatistics = (data, cb, next) => {
	DataProvider.getStatistics(data, cb, next);
};
