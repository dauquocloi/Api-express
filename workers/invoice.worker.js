const Queue = require('bull');
const { redisDb } = require('../config');
const { handleLockInvoiceJob } = require('../jobs/invoice/invoice.processor');
const { LOCK_INVOICE } = require('../jobs/constant/jobNames');
const Sentry = require('@sentry/node');

const lockInvoiceQueue = new Queue(LOCK_INVOICE, redisDb.opts);

lockInvoiceQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${LOCK_INVOICE} #${job.id}`);
		const { data } = job;
		return await handleLockInvoiceJob(data);
	} catch (error) {
		console.error(`[❌ Failed] ${LOCK_INVOICE} #${job.id}`, error);
		throw error;
	}
});

lockInvoiceQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

lockInvoiceQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: LOCK_INVOICE,
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
