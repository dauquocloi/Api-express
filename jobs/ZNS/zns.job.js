const { znsNewInvoiceNotiQueue } = require('./zns.queue');

const znsNewInvoiceNotiJob = async (data) => {
	return znsNewInvoiceNotiQueue.enqueue(data);
};

module.exports = { znsNewInvoiceNotiJob };
