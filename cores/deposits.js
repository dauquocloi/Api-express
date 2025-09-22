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

exports.modifyDeposit = (data, cb, next) => {
	DataProvider.modifyDeposit(data, cb, next);
};

exports.terminateDeposit = (data, cb, next) => {
	DataProvider.terminateDeposit(data, cb, next);
};

exports.getDepositDetailByRoomId = (data, cb, next) => {
	DataProvider.getDepositDetailByRoomId(data, cb, next);
};
