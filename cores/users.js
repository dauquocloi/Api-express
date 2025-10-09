var DataProvider = require('../data_providers/users');

exports.getAll = (data, cb) => {
	DataProvider.getAll(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, { count: 5, data: result });
		}
	});
};

exports.create = (data, cb) => {
	DataProvider.create(data, cb);
};

exports.login = (data, cb, next, res) => {
	DataProvider.login(data, cb, next, res);
};

// no used anymnore
exports.getEmail = (data, cb) => {
	DataProvider.getEmail(data, (errs, result) => {
		if (errs) {
			console.log('this is log of error from getEmail', errs);
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};

exports.getEmailbyToken = (data, cb) => {
	DataProvider.getEmailbyToken(data, (errs, result) => {
		if (errs) {
			console.log(errs);
			cb(errs, null);
		} else {
			console.log('đã chọc đến EmailbyToken');
			console.log({ result });
			cb(null, { result });
		}
	});
};

exports.getUserByUserId = (data, cb) => {
	DataProvider.getUserByUserId(data, (errs, result) => {
		if (errs) {
			console.log(errs);
			cb(errs, null);
		} else {
			console.log({ result });
			cb(null, { result });
		}
	});
};

exports.getUserByFullName = (data, cb) => {
	DataProvider.getUserByFullName(data, (errs, result) => {
		if (errs) {
			console.log(errs);
			cb(errs, null);
		} else {
			cb(null, { result });
		}
	});
};

exports.modifyPassword = (data, cb, next) => {
	DataProvider.modifyPassword(data, cb, next);
};

exports.modifyUserInfo = (data, cb, next) => {
	DataProvider.modifyUserInfo(data, cb, next);
};

exports.getAllManagers = (data, cb, next) => {
	DataProvider.getAllManagers(data, cb, next);
};

exports.getRefreshToken = (req, cb, next) => {
	DataProvider.getRefreshToken(req, cb, next);
};

exports.removeManager = (req, cb, next) => {
	DataProvider.removeManager(req, cb, next);
};

exports.getAllManagement = (data, cb, next) => {
	DataProvider.getAllManagement(data, cb, next);
};

exports.createManager = (data, cb, next) => {
	DataProvider.createManager(data, cb, next);
};

exports.modifyUserPermission = (data, cb, next) => {
	DataProvider.modifyUserPermission(data, cb, next);
};

exports.checkManagerCollectedCash = (data, cb, next) => {
	DataProvider.checkManagerCollectedCash(data, cb, next);
};

exports.changeUserBuildingManagement = (data, cb, next) => {
	DataProvider.changeUserBuildingManagement(data, cb, next);
};
