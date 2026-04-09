const { notiTaskCompleted, notiManagerCollectCashInvoice } = require('./notification.queue');

const notiTaskCompletedJob = async (data) => {
	return notiTaskCompleted.enqueue(data);
};

const notiManagerCollectCashInvoiceJob = async (data) => {
	return notiManagerCollectCashInvoice.enqueue(data);
};

module.exports = { notiTaskCompletedJob, notiManagerCollectCashInvoiceJob };
