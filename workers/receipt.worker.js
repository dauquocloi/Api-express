const { LOCK_RECEIPT } = require('../jobs/constant/jobNames');
const Queue = require('bull');

const { redisDb } = require('../config');
const { handleLockReceiptJob } = require('../jobs/receipt/receipt.processor');
const Sentry = require('@sentry/node');

const lockReceiptQueue = new Queue(LOCK_RECEIPT, redisDb.opts);

lockReceiptQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${LOCK_RECEIPT} #${job.id}`);
		const { data } = job;
		return await handleLockReceiptJob(data);
	} catch (error) {
		console.error(`[❌ Failed] ${LOCK_RECEIPT} #${job.id}`, error);
		throw error;
	}
});

lockReceiptQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

lockReceiptQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: LOCK_RECEIPT,
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
