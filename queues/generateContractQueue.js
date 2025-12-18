const Queue = require('bull');
const dotenv = require('dotenv');
const Sentry = require('@sentry/node');

dotenv.config();

const generateContractQueue = new Queue('generateContract', process.env.REDIS_URL);

// ---- Listeners ----
generateContractQueue.on('completed', (job, result) => {
	console.log(`✅ generateContractQueue Job ${job.id} completed:`, result);
});

generateContractQueue.on('failed', (job, err) => {
	console.error(`❌ generateContractQueue Job ${job.id} failed:`, err.message);

	Sentry.captureException(err, {
		level: 'error',
		tags: {
			queue: 'generateContractQueue',
			jobId: job.id,
		},
		extra: {
			jobData: job.data,
			attemptsMade: job.attemptsMade,
		},
	});
});

module.exports = generateContractQueue;
