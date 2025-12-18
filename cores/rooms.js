var DataProvider = require('../data_providers/rooms');
const { modifyContractQueue } = require('./../queues');

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

exports.getRoom = (data, cb, next) => {
	DataProvider.getRoom(
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

exports.create = (data, cb) => {
	DataProvider.create(data, cb);
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

exports.finance = (data, cb) => {
	DataProvider.finance(data, cb);
};

exports.importImage = (data, cb, next) => {
	DataProvider.importImage(data, cb, next);
};
exports.addInterior = (data, cb, next) => {
	DataProvider.addInterior(data, cb, next);
};

exports.removeInterior = (data, cb, next) => {
	DataProvider.removeInterior(data, cb, next);
};

exports.editInterior = (data, cb, next) => {
	DataProvider.editInterior(data, cb, next);
};

exports.getListSelectingRoom = (data, cb, next) => {
	DataProvider.getListSelectingRoom(data, cb, next);
};

exports.generateDepositReceiptAndFirstInvoice = (data, cb, next) => {
	DataProvider.generateDepositReceiptAndFirstInvoice(data, cb, next);
};

exports.updateNoteRoom = (data, cb, next) => {
	DataProvider.updateNoteRoom(data, cb, next);
};

exports.modifyRent = (data, cb, next) => {
	DataProvider.modifyRent(
		data,
		(err, result) => {
			if (err) cb(err, null);
			if (result.contractId) {
				modifyContractQueue.add(
					{
						contractId: result.contractId,
					},
					{
						attempts: 1,
						backoff: 1000,
						removeOnComplete: true,
						removeOnFail: false,
					},
				);
			}
			cb(null, 'success');
		},
		next,
	);
};

exports.generateCheckoutCost = (data, cb, next) => {
	DataProvider.generateCheckoutCosts(data, cb, next);
};

exports.getCheckoutCostDetail = (data, cb, next) => {
	DataProvider.getCheckoutCostDetail(data, cb, next);
};

exports.getCheckoutCosts = (data, cb, next) => {
	DataProvider.getCheckoutCosts(data, cb, next);
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
