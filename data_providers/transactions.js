const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const AppError = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');

exports.handleSepayIPN = (data) => {
	let session;
	try {
		if (data.transfer_type === 'credit') {
			const tracsactionContent = data.content;
		}
	} catch (error) {
		next(error);
	}
};

exports.collectCashFromEmployee = async (data, cb, next) => {
	try {
		const transactionObjectId = mongoose.Types.ObjectId(data.transactionId);
		const ownerObjectId = mongoose.Types.ObjectId(data.userId);

		const transaction = await Entity.TransactionsEntity.findOne({ _id: transactionObjectId });
		if (!transaction) {
			throw new AppError(errorCodes.notExist, `Giao dịch không tồn tại!`, 200);
		}

		transaction.collector = ownerObjectId;
		await transaction.save();

		cb(null, { type: transaction.invoice == null ? 'receipt' : 'invoice' });
	} catch (error) {
		next(error);
	}
};
