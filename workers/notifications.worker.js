const Queue = require('bull');
const { redisDb } = require('../config');
const { handleNotiTaskCompletedJob, handleNotiManagerCollectCashInvoice } = require('../jobs/notification/notification.process');
const { NOTI_TASK_COMPLETED, NOTI_MANAGER_COLLECT_CASH_INVOICE } = require('../jobs/constant/jobNames');

const notiTaskCompletedQueue = new Queue(NOTI_TASK_COMPLETED, redisDb.url);
const notiManagerCollectCashInvoiceQueue = new Queue(NOTI_MANAGER_COLLECT_CASH_INVOICE, redisDb.url);

notiTaskCompletedQueue.process(3, async (job) => {
	console.log(`[⚙️ Processing] ${NOTI_TASK_COMPLETED} #${job.id}`);
	const { data } = job;
	return handleNotiTaskCompletedJob(data);
});

// notiManagerCollectCashInvoiceQueue.process(3, async (job) => {
// 	const { data } = job;
// 	return handleNotiManagerCollectCashInvoice(data.payload);
// });

notiTaskCompletedQueue.on('completed', (job, result) => {
	console.log(`✅ Job completed: ${job.id}, Result:`, result);
});

notiTaskCompletedQueue.on('failed', (job, error) => {
	console.error(`❌ Job failed: ${job.id}, Error:`, error);
});
