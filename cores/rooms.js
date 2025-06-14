var DataProvider = require('../data_providers/rooms');

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
