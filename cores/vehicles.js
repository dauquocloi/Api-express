var DataProvider = require('../data_providers/vehicles');

exports.getAll = (data, cb) => {
	DataProvider.getAll(data, (err, result) => {
		if (err) {
			cb(err, null);
		} else {
			cb(null, result);
		}
	});
};
