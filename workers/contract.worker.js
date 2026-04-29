const Queue = require('bull');
const { redisDb } = require('../config');
const { handleGenerateContractJob } = require('../jobs/contract/contract.process');
const { GENERATE_CONTRACT_QUEUE } = require('../jobs/constant/jobNames');
const Sentry = require('@sentry/node');

const generateContractQueue = new Queue(GENERATE_CONTRACT_QUEUE, redisDb.opts);

generateContractQueue.process(5, async (job) => {
	const { data } = job;
	return handleGenerateContractJob(data.payload);
});

generateContractQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

generateContractQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: GENERATE_CONTRACT_QUEUE,
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
