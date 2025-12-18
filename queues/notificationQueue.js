const Queue = require('bull');
const dotenv = require('dotenv');
dotenv.config();

const notificationQueue = new Queue('notification', process.env.REDIS_URL);

// ---- Listeners ----
notificationQueue.on('completed', (job, result) => {
	console.log(`✅ notificationQueue Job ${job.id} completed:`, result);
});

notificationQueue.on('failed', (job, err) => {
	console.error(`❌ notificationQueue Job ${job.id} failed:`, err.message);
});

module.exports = notificationQueue;
