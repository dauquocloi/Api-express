var DataProvider = require('../data_providers/receipts');
const { notificationQueue } = require('../queues');

exports.createReceipt = (data, cb, next) => {
	DataProvider.createReceipt(data, cb, next);
};

exports.createDepositReceipt = (data, cb, next) => {
	DataProvider.createDepositReceipt(data, cb, next);
};

exports.getListReceiptPaymentStatus = (data, cb, next) => {
	DataProvider.getListReceiptPaymentStatus(data, cb, next);
};

exports.getReceiptDetail = (data, cb, next) => {
	DataProvider.getReceiptDetail(data, cb, next);
};

exports.collectCashMoney = (data, cb, next) => {
	DataProvider.collectCashMoney(
		data,
		(err, result) => {
			if (err) {
				return cb(err, null);
			}

			if (result.role != 'owner') {
				notificationQueue.add(
					{
						type: 'collectCash',
						payload: {
							buildingId: result.buildingId, // getBuildingName
							collectorName: result.collectorName,
							billType: 'receipt',
							amount: result.amount,
							receiptId: result.receiptId,
						},
					},
					{
						attempts: 1,
						backoff: 1000,
						removeOnComplete: true,
						removeOnFail: false,
					},
				);
				console.log('✅ Job added to notification queue');
			}

			cb(null, result);
		},
		next,
	);
};

exports.modifyReceipt = (data, cb, next) => {
	DataProvider.modifyReceipt(data, cb, next);
};

exports.deleteReceipt = (data, cb, next) => {
	DataProvider.deleteReceipt(data, cb, next);
};

exports.createDebtsReceipt = (data, cb, next) => {
	DataProvider.createDebtsReceipt(data, cb, next);
};

exports.getDepositReceiptDetail = (data, cb, next) => {
	DataProvider.getDepositReceiptDetail(data, cb, next);
};
