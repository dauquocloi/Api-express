var DataProvider = require('../data_providers/companies');

exports.createCompany = (data, cb, next) => {
	DataProvider.createCompany(data, cb, next);
};
