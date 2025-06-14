const DataProvider = require('../data_providers/revenues');

exports.createIncidentalRevenue = (data, cb, next) => {
	DataProvider.createIncidentalRevenue(data, cb, next);
};

exports.modifyIncidentalRevenue = (data, cb, next) => {
	DataProvider.modifyIncidentalRevenue(data, cb, next);
};

exports.deleteIncidentalRevenue = (data, cb, next) => {
	DataProvider.deleteIncidentalRevenue(data, cb, next);
};

exports.getFeeRevenueDetail = (data, cb, next) => {
	DataProvider.getFeeRevenueDetail(data, cb, next);
};
