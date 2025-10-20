var DataProvider = require('../data_providers/invoices');

exports.getAll = (data, cb, next) => {
	DataProvider.getAll(
		data,
		(errs, result) => {
			if (errs) {
				cb(errs, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.getFeeForGenerateInvoice = (data, cb, next) => {
	DataProvider.getFeeForGenerateInvoice(
		data,
		(err, result) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.create = (data, cb, next) => {
	DataProvider.create(
		data,
		(err, result) => {
			if (err) {
				cb(err, null);
			} else {
				cb(null, result);
			}
		},
		next,
	);
};

exports.update = (data, cb) => {
	DataProvider.update(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};

exports.getInvoiceStatus = (data, cb, next) => {
	DataProvider.getInvoiceStatus(data, cb, next);
};

exports.getInvoicesPaymentStatus = (data, cb, next) => {
	DataProvider.getInvoicesPaymentStatus(data, cb, next);
};

exports.getInvoiceDetail = (data, cb, next) => {
	DataProvider.getInvoiceDetail(data, cb, next);
};

exports.generateFirstInvoice = (data, cb, next) => {
	DataProvider.generateFirstInvoice(data, cb, next);
};

exports.collectCashMoney = (data, cb, next) => {
	DataProvider.collectCashMoney(data, cb, next);
};

exports.getInvoiceInfoByInvoiceCode = (data, cb, next) => {
	DataProvider.getInvoiceInfoByInvoiceCode(data, cb, next);
};

exports.modifyInvoice = (data, cb, next) => {
	DataProvider.modifyInvoice(data, cb, next);
};

// exports.getEmail = (data, cb) => {
// 	DataProvider.getEmail(data, (errs, result) => {
// 		if (errs) {
// 			console.log(errs);
// 			cb(errs, null);
// 		} else {
// 			console.log('đã chọc đến đây');

// 			cb(null, { data: result });
// 		}
// 	});
// };

// exports.getEmailbyToken = (data, cb) => {
// 	DataProvider.getEmailbyToken(data, (errs, result) => {
// 		if (errs) {
// 			console.log(errs);
// 			cb(errs, null);
// 		} else {
// 			console.log('đã chọc đến EmailbyToken');
// 			console.log({ data: result });
// 			cb(null, { data: result });
// 		}
// 	});
// };
