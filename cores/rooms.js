var DataProvider = require('../data_providers/rooms');

exports.getAll = (data, cb) => {
	DataProvider.getAll(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
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
