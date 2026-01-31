var DataProvider = require('../../data_providers/admin/rooms');

exports.addManyRooms = (data, cb, next) => {
	DataProvider.addManyRooms(
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
