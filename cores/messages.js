var DataProvider = require('../data_providers/messages');

exports.getAllMessagesByUserId = (data, cb) => {
	DataProvider.getAllMessagesByUserId(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};

exports.newMessage = (data, cb) => {
	DataProvider.newMessage(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};

exports.testCreateMessage = (data, cb) => {
	console.log('đã chọc đến core');
	DataProvider.testCreateMessage(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};

exports.getAllInfoByTextInput = (data, cb) => {
	DataProvider.getAllInfoByTextInput(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};

exports.getMessagesByConversationId = (data, cb) => {
	DataProvider.getMessagesByConversationId(data, (errs, result) => {
		if (errs) {
			cb(errs, null);
		} else {
			cb(null, result);
		}
	});
};
