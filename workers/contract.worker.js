const Queue = require('bull');
const { redisDb } = require('../config');
const { handleGenerateContractJob, handleModifyContractJob } = require('../jobs/contract/contract.process');
const { CONTRACT_QUEUE, GENERATE_CONTRACT, MODIFY_CONTRACT } = require('../jobs/constant/jobNames');
const Sentry = require('@sentry/node');

const contractQueue = new Queue(CONTRACT_QUEUE, redisDb.opts);

contractQueue.process(5, async (job) => {
	const { data } = job;
	const { type } = data;
	switch (type) {
		case GENERATE_CONTRACT: {
			return handleGenerateContractJob(data);
		}
		case MODIFY_CONTRACT: {
			return handleModifyContractJob(data);
		}
	}
});

contractQueue.on('completed', (job, result) => {
	console.log(` Job completed: ${job.id}, Result:`, result);
});

contractQueue.on('failed', (job, error) => {
	console.error(` Job failed: ${job.id}, Error:`, error);

	Sentry.captureException(error, {
		level: 'error',
		tags: {
			job: job.data.type,
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
