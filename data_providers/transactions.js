const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');

exports.handleSepayIPN = (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);

		if (data.transfer_type === 'credit') {
			const tracsactionContent = data.content;
		}
	} catch (error) {
		next(error);
	}
};

exports.collectCash = (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
	} catch (error) {
		next(error);
	}
};

exports.collectCashFromEmployee = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const transactionObjectId = mongoose.Types.ObjectId(data.transactionId);
		const ownerObjectId = mongoose.Types.ObjectId(data.userId);

		const transaction = await Entity.TransactionsEntity.findOne({ _id: transactionObjectId });
		if (!transaction) {
			throw new Error(`Giao dịch ${data.transaction} không tồn tại!`);
		}

		if (transaction.collector != ownerObjectId) {
			transaction.collector = ownerObjectId;
			await transaction.save();
			cb(null, 'modified');
		} else cb(null, 'no content');
	} catch (error) {
		next(error);
	}
};
