// // queue/index.js
// const Queue = require('bull');
// const dotenv = require('dotenv');
// dotenv.config();

// const notificationQueue = new Queue('notification', {
// 	connection: {
// 		url: process.env.REDIS_URL,
// 		retryStrategy: (retries) => null,
// 	},
// });
// notificationQueue.client.on('ready', () => console.log('✅ Redis connected'));
// notificationQueue.client.on('error', (err) => console.error('❌ Redis error:', err));

// notificationQueue.on('completed', (job, result) => {
// 	console.log(`✅ Job ${job.id} completed with result:`, result);
// });

// notificationQueue.on('failed', (job, err) => {
// 	console.error(`❌ Job ${job.id} failed:`, err.message);
// });

// module.exports = {
// 	notificationQueue,
// };
