const DataProvider = require('../data_providers/notifications');

exports.getNotifications = (data, cb, next) => {
	DataProvider.getNotifications(data, cb, next);
};
