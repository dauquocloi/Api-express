const {
	// notiTaskCompleted,
	// notiManagerCollectCashInvoice,
	// notiManagerCollectCashReceipt,
	// notiPayment,
	// notiContractNearExpired,
	// notiTransactionDeclined,
	// notiRoomDeposited,
	// notiDepositTerminated,
	notificationQueues,
} = require('./notification.queue');
// const {
// 	NOTI_TASK_COMPLETED,
// 	NOTI_MANAGER_COLLECT_CASH_INVOICE,
// 	NOTI_PAYMENT,
// 	NOTI_CONTRACT_NEAR_EXPIRATION,
// 	NOTI_TRANSACTION_DECLINED,
// 	NOTI_MANAGER_COLLECT_CASH_RECEIPT,
// 	NOTI_ROOM_DEPOSITED,
// 	NOTI_DEPOSIT_TERMINATED,
// } = require('../constant/jobNames');

// const notiTaskCompletedJob = async (data) => {
// 	return notiTaskCompleted.enqueue(data);
// };

// const notiManagerCollectCashInvoiceJob = async (data) => {
// 	return notiManagerCollectCashInvoice.enqueue(data);
// };

// const notiManagerCollectCashReceiptJob = async (data) => {
// 	return notiManagerCollectCashReceipt.enqueue(data);
// };

// const notiPaymentJob = async (data) => {
// 	return notiPayment.enqueue(data);
// };

// const notiContractNearExpiredJob = async (data) => {
// 	return notiContractNearExpired.enqueue(data);
// };

// const notiTransactionDeclinedJob = async (data) => {
// 	return notiTransactionDeclined.enqueue(data);
// };

// const notiRoomDepositedJob = async (data) => {
// 	return notiRoomDeposited.enqueue(data);
// };

// const notiDepositTerminatedJob = async (data) => {
// 	return notiDepositTerminated.enqueue(data);
// };

const notificationJob = async (data) => {
	// const { notiType } = data;
	// switch (notiType) {
	// 	case NOTI_TASK_COMPLETED:
	// 		return notificationQueues.enqueue(data);
	// 	case NOTI_MANAGER_COLLECT_CASH_INVOICE:
	// 		return notiManagerCollectCashInvoiceJob(data);
	// 	case NOTI_MANAGER_COLLECT_CASH_RECEIPT:
	// 		return notiManagerCollectCashReceiptJob(data);
	// 	case NOTI_PAYMENT:
	// 		return notiPaymentJob(data);
	// 	case NOTI_CONTRACT_NEAR_EXPIRATION:
	// 		return notiContractNearExpiredJob(data);
	// 	case NOTI_TRANSACTION_DECLINED:
	// 		return notiTransactionDeclinedJob(data);
	// 	case NOTI_ROOM_DEPOSITED:
	// 		return notiRoomDepositedJob(data);
	// 	case NOTI_DEPOSIT_TERMINATED:
	// 		return notiDepositTerminatedJob(data);
	// }

	return notificationQueues.enqueue(data);
};

module.exports = {
	// notiTaskCompletedJob,
	// notiManagerCollectCashInvoiceJob,
	// notiManagerCollectCashReceiptJob,
	// notiPaymentJob,
	// notiContractNearExpiredJob,
	// notiTransactionDeclinedJob,
	// notiRoomDepositedJob,
	// notiDepositTerminatedJob,
	notificationJob,
};
