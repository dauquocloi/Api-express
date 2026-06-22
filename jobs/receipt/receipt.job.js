const { lockReceipt } = require('./receipt.queue');

const lockReceiptJob = async (data, options) => {
	return lockReceipt.enqueue(data, options);
};

module.exports = { lockReceiptJob };
