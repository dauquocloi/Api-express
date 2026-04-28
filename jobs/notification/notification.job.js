const {
	notiTaskCompleted,
	notiManagerCollectCashInvoice,
	notiManagerCollectCashReceipt,
	notiPayment,
	notiContractNearExpired,
	notiTransactionDeclined,
} = require('./notification.queue');

const notiTaskCompletedJob = async (data) => {
	return notiTaskCompleted.enqueue(data);
};

const notiManagerCollectCashInvoiceJob = async (data) => {
	return notiManagerCollectCashInvoice.enqueue(data);
};

const notiManagerCollectCashReceiptJob = async (data) => {
	return notiManagerCollectCashReceipt.enqueue(data);
};

const notiPaymentJob = async (data) => {
	return notiPayment.enqueue(data);
};

const notiContractNearExpiredJob = async (data) => {
	return notiContractNearExpired.enqueue(data);
};

const notiTransactionDeclinedJob = async (data) => {
	return notiTransactionDeclined.enqueue(data);
};

module.exports = {
	notiTaskCompletedJob,
	notiManagerCollectCashInvoiceJob,
	notiManagerCollectCashReceiptJob,
	notiPaymentJob,
	notiContractNearExpiredJob,
	notiTransactionDeclinedJob,
};
