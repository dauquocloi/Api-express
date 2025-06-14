var DataProvider = require('../data_providers/receipts');

exports.createReceipt = (data, cb, next) => {
	DataProvider.createReceipt(data, cb, next);
};

exports.createDepositReceipt = (data, cb, next) => {
	DataProvider.createDepositReceipt(data, cb, next);
};

exports.getListReceiptPaymentStatus = (data, cb, next) => {
	DataProvider.getListReceiptPaymentStatus(data, cb, next);
};

exports.getReceiptDetail = (data, cb, next) => {
	DataProvider.getReceiptDetail(data, cb, next);
};

exports.collectCashMoney = (data, cb, next) => {
	DataProvider.collectCashMoney(data, cb, next);
};

exports.deleteReceipt = (data, cb, next) => {
	DataProvider.deleteReceipt(data, cb, next);
};
