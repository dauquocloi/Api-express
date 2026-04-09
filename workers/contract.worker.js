const Queue = require('bull');
const redisConnection = require('../config').redis;
const { handleGenerateContractJob } = require('../jobs/contract/contract.process');

const queue = new Queue('contractQueue', redisConnection);

queue.process(5, async (job) => {
	const { data } = job;
	return handleGenerateContractJob(data.payload);
});
