const { lockInvoice } = require('./invoice.queue');

const lockInvoiceJob = async (data, options) => {
	return lockInvoice.enqueue(data, options);
};

module.exports = { lockInvoiceJob };
