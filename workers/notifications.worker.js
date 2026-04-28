const Queue = require('bull');
const { redisDb } = require('../config');
const {
	handleNotiTaskCompletedJob,
	handleNotiManagerCollectCashInvoice,
	handleNotiManagerCollectCashReceipt,
	handleNotiPayment,
	handleNotiContractNearExpired,
	handleNotiTransactionDeclined,
} = require('../jobs/notification/notification.processor');
const {
	NOTI_TASK_COMPLETED,
	NOTI_MANAGER_COLLECT_CASH_INVOICE,
	NOTI_MANAGER_COLLECT_CASH_RECEIPT,
	NOTI_PAYMENT,
	NOTI_CONTRACT_NEAR_EXPIRATION,
	NOTI_TRANSACTION_DECLINED,
} = require('../jobs/constant/jobNames');
const Sentry = require('@sentry/node');

const notiTaskCompletedQueue = new Queue(NOTI_TASK_COMPLETED, redisDb.opts);

notiTaskCompletedQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${NOTI_TASK_COMPLETED} #${job.id}`);
		const { data } = job;
		return await handleNotiTaskCompletedJob(data);
	} catch (error) {
		console.error(`[❌ Failed] ${NOTI_TASK_COMPLETED} #${job.id}`, error);
		throw error;
	}
});

notiTaskCompletedQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

notiTaskCompletedQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: NOTI_TASK_COMPLETED,
			jobId: job.id,
			component: 'background-job',
			status: 'failed',
		},
		extra: {
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			maxAttempts: job.opts.attempts,
			errorMessage: error.message,
			errorStack: error.stack,
		},
	});
});

const notiManagerCollectCashInvoiceQueue = new Queue(NOTI_MANAGER_COLLECT_CASH_INVOICE, redisDb.opts);

notiManagerCollectCashInvoiceQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${NOTI_MANAGER_COLLECT_CASH_INVOICE} #${job.id}`);
		const { data } = job;
		return await handleNotiManagerCollectCashInvoice(data);
	} catch (error) {
		console.error(`[❌ Failed] ${NOTI_MANAGER_COLLECT_CASH_INVOICE} #${job.id}`, error);
		throw error;
	}
});

notiManagerCollectCashInvoiceQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

notiManagerCollectCashInvoiceQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: NOTI_MANAGER_COLLECT_CASH_INVOICE,
			jobId: job.id,
			component: 'background-job',
			status: 'failed',
		},
		extra: {
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			maxAttempts: job.opts.attempts,
			errorMessage: error.message,
			errorStack: error.stack,
		},
	});
});

const notiManagerCollectCashReceiptQueue = new Queue(NOTI_MANAGER_COLLECT_CASH_RECEIPT, redisDb.opts);

notiManagerCollectCashReceiptQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${NOTI_MANAGER_COLLECT_CASH_RECEIPT} #${job.id}`);
		const { data } = job;
		return await handleNotiManagerCollectCashReceipt(data);
	} catch (error) {
		console.error(`[❌ Failed] ${NOTI_MANAGER_COLLECT_CASH_RECEIPT} #${job.id}`, error);
		throw error;
	}
});

notiManagerCollectCashReceiptQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

notiManagerCollectCashReceiptQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: NOTI_MANAGER_COLLECT_CASH_RECEIPT,
			jobId: job.id,
			component: 'background-job',
			status: 'failed',
		},
		extra: {
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			maxAttempts: job.opts.attempts,
			errorMessage: error.message,
			errorStack: error.stack,
		},
	});
});

const notiPaymentQueue = new Queue(NOTI_PAYMENT, redisDb.opts);

notiPaymentQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${NOTI_PAYMENT} #${job.id}`);
		const { data } = job;
		return await handleNotiPayment(data);
	} catch (error) {
		console.error(`[❌ Failed] ${NOTI_PAYMENT} #${job.id}`, error);
		throw error;
	}
});

notiPaymentQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

notiPaymentQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: NOTI_PAYMENT,
			jobId: job.id,
			component: 'background-job',
			status: 'failed',
		},
		extra: {
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			maxAttempts: job.opts.attempts,
			errorMessage: error.message,
			errorStack: error.stack,
		},
	});
});

const notiContractNearExpiredQueue = new Queue(NOTI_CONTRACT_NEAR_EXPIRATION, redisDb.opts);

notiContractNearExpiredQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${NOTI_CONTRACT_NEAR_EXPIRATION} #${job.id}`);
		const { data } = job;
		return await handleNotiContractNearExpired(data);
	} catch (error) {
		console.error(`[❌ Failed] ${NOTI_CONTRACT_NEAR_EXPIRATION} #${job.id}`, error);
		throw error;
	}
});

notiContractNearExpiredQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

notiContractNearExpiredQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: NOTI_CONTRACT_NEAR_EXPIRATION,
			jobId: job.id,
			component: 'background-job',
			status: 'failed',
		},
		extra: {
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			maxAttempts: job.opts.attempts,
			errorMessage: error.message,
			errorStack: error.stack,
		},
	});
});

const notiTransactionDeclinedQueue = new Queue(NOTI_TRANSACTION_DECLINED, redisDb.opts);

notiTransactionDeclinedQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${NOTI_TRANSACTION_DECLINED} #${job.id}`);
		const { data } = job;
		return await handleNotiTransactionDeclined(data);
	} catch (error) {
		console.error(`[❌ Failed] ${NOTI_TRANSACTION_DECLINED} #${job.id}`, error);
		throw error;
	}
});

notiTransactionDeclinedQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

notiTransactionDeclinedQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: NOTI_TRANSACTION_DECLINED,
			jobId: job.id,
			component: 'background-job',
			status: 'failed',
		},
		extra: {
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			maxAttempts: job.opts.attempts,
			errorMessage: error.message,
			errorStack: error.stack,
		},
	});
});
