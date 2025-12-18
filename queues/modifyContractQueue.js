const Queue = require('bull');
const dotenv = require('dotenv');
const Sentry = require('@sentry/node');

dotenv.config();

const modifyContractQueue = new Queue('modifyContractQueue', process.env.REDIS_URL);

// ---- Listeners ----
modifyContractQueue.on('completed', (job, result) => {
	console.log(`✅ modifyContractQueue Job ${job.id} completed:`, result);
});

modifyContractQueue.on('failed', (job, err) => {
	console.error(`❌ modifyContractQueue Job ${job.id} failed:`, err.message);

	Sentry.captureException(err, {
		level: 'error',
		tags: {
			queue: 'modifyContractQueue',
			jobId: job.id,
		},
		extra: {
			jobData: job.data,
			attemptsMade: job.attemptsMade,
		},
	});
});

module.exports = modifyContractQueue;
