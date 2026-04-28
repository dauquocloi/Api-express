const Queue = require('bull');
const { redisDb } = require('../../config');

class BaseQueue {
	constructor(queueName) {
		this.queueName = queueName;
		this.queue = new Queue(queueName, redisDb.opts);
	}

	async enqueue(data, options = {}) {
		try {
			const defaultOptions = {
				attempts: 3, // Retry 3 lần nếu fail
				backoff: {
					type: 'exponential',
					delay: 2000,
				},
				removeOnComplete: true, // Xoá job khi hoàn thành
				removeOnFail: false, // Giữ lại job fail để debug
				timeout: 5000, // Timeout sau 30 giây
			};

			const finalOptions = { ...defaultOptions, ...options };

			const job = await this.queue.add(data, finalOptions);
			console.log(`[📝 Job Enqueued] ${this.queueName} #${job.id}`);

			return job;
		} catch (error) {
			console.error(`[❌ Job Enqueued Failed] ${this.queueName} #${job.id}`, error);
			throw error;
		}
	}
}

module.exports = BaseQueue;
