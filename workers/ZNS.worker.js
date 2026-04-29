const Queue = require('bull');
const { redisDb } = require('../config');
const { handleZNSNewInvoiceNotiJob } = require('../jobs/ZNS/zns.processor');
const { ZNS_NEW_INVOICE_NOTI } = require('../jobs/constant/jobNames');
const Sentry = require('@sentry/node');

const znsNewInvoiceNotiQueue = new Queue(ZNS_NEW_INVOICE_NOTI);

znsNewInvoiceNotiQueue.process(3, async (job) => {
	try {
		console.log(`[⚙️ Processing] ${ZNS_NEW_INVOICE_NOTI} #${job.id}`);
		const { data } = job;
		return await handleZNSNewInvoiceNotiJob(data);
	} catch (error) {
		console.error(`[❌ Failed] ${ZNS_NEW_INVOICE_NOTI} #${job.id}`, error);
		throw error;
	}
});

znsNewInvoiceNotiQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

znsNewInvoiceNotiQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: ZNS_NEW_INVOICE_NOTI,
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
