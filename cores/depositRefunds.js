let DataProvider = require('../data_providers/depositRefunds');

exports.getAllDepositRefunds = (data, cb, next) => {
	DataProvider.getAllDepositRefunds(data, cb, next);
};

exports.getDepositRefund = (data, cb, next) => {
	DataProvider.getDepositRefund(data, cb, next);
};

exports.generateDepositRefund = (data, cb, next) => {
	DataProvider.generateDepositRefund(data, cb, next);
};

exports.modifyDepositRefund = (data, cb, next) => {
	DataProvider.modifyDepositRefund(data, cb, next);
};

exports.submitDepositRefund = (data, cb, next) => {
	DataProvider.submitDepositRefund(data, cb, next);
};
