const BaseQueue = require('../Base/BaseQueue');
const {
	NOTI_TASK_COMPLETED,
	NOTI_MANAGER_COLLECT_CASH_INVOICE,
	NOTI_PAYMENT,
	NOTI_CONTRACT_NEAR_EXPIRATION,
	NOTI_TRANSACTION_DECLINED,
	NOTI_MANAGER_COLLECT_CASH_RECEIPT,
} = require('../constant/jobNames');

const notiTaskCompleted = new BaseQueue(NOTI_TASK_COMPLETED);

const notiManagerCollectCashInvoice = new BaseQueue(NOTI_MANAGER_COLLECT_CASH_INVOICE);

const notiManagerCollectCashReceipt = new BaseQueue(NOTI_MANAGER_COLLECT_CASH_RECEIPT);

const notiPayment = new BaseQueue(NOTI_PAYMENT);

const notiContractNearExpired = new BaseQueue(NOTI_CONTRACT_NEAR_EXPIRATION);

const notiTransactionDeclined = new BaseQueue(NOTI_TRANSACTION_DECLINED);

module.exports = {
	notiTaskCompleted,
	notiManagerCollectCashInvoice,
	notiManagerCollectCashReceipt,
	notiPayment,
	notiContractNearExpired,
	notiTransactionDeclined,
};
