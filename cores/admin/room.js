var DataProvider = require('../../data_providers/admin/room');

exports.addManyRooms = (data, cb) => {
	DataProvider.addManyRooms(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};
