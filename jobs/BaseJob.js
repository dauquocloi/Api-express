// jobs/BaseJob.js
const Queue = require('bull');
const redis = require('../config/redisClient');

class BaseJob {
	constructor(queueName) {
		this.queueName = queueName;

		this.queue = new Queue(queueName, redis);
		this.process();
		this.setupListeners();
	}

	// phải override ở class con
	async handle(payload) {
		throw new Error(`handle() method not implemented in ${this.constructor.name}`);
	}

	/**
	 * Thực thi job
	 * @param {Object} payload - Dữ liệu job
	 * @param {string} [jobId] - ID của job (optional)
	 * @param {Object} [options] - Tuỳ chọn Bull queue
	 */
	async enqueue(payload, jobId = null, options = {}) {
		try {
			const jobData = {
				payload: payload,
				createdAt: new Date(),
				jobId,
			};

			const defaultOptions = {
				attempts: 3, // Retry 3 lần nếu fail
				backoff: {
					type: 'exponential',
					delay: 2000,
				},
				removeOnComplete: true, // Xoá job khi hoàn thành
				removeOnFail: false, // Giữ lại job fail để debug
			};

			const finalOptions = { ...defaultOptions, ...options };

			if (jobId) {
				const oldJob = await this.queue.getJob(jobId);
				if (oldJob) {
					await oldJob.remove();
					console.log(`[♻️ Job Overwritten] Removed old job #${jobId} to reset timer.`);
				}
				finalOptions.jobId = jobId;
			}

			const job = await this.queue.add(jobData, finalOptions);
			console.log(`[📝 Job Enqueued] ${this.queueName} #${job.id}`);

			return job;
		} catch (error) {
			console.error(`[❌ Enqueue Error] ${this.queueName}`, error);
			throw error;
		}
	}

	/**
	 * Process job (Worker) - lắng nghe khi job được execute
	 */
	process() {
		this.queue.process(async (job) => {
			try {
				console.log(`[⚙️ Processing] ${this.queueName} #${job.id}`);

				const result = await this.handle(job.data.payload);

				await this.onSuccess(job, result);
				return result;
			} catch (error) {
				console.error(`[❌ Job Failed] ${this.queueName} #${job.id}`, error);
				await this.onFailed(job, error);
				throw error;
			}
		});
	}

	/**
	 * Setup event listeners
	 */
	setupListeners() {
		this.queue.on('completed', (job, result) => {
			console.log(`[✅ Completed] ${this.queueName} #${job.id}`);
			this.onCompleted(job, result);
		});

		this.queue.on('failed', (job, error) => {
			console.log(`[⚠️ Failed] ${this.queueName} #${job.id}: ${error.message}`);
		});

		this.queue.on('stalled', (job) => {
			console.warn(`[🔄 Stalled] ${this.queueName} #${job.id}`);
		});
	}

	/**
	 * Callback khi job thành công
	 */
	async onSuccess(job, result) {
		// Override ở class con nếu cần
	}

	/**
	 * Callback khi job fail
	 */
	async onFailed(job, error) {
		// Override ở class con nếu cần
	}

	/**
	 * Callback khi job hoàn thành (complete)
	 */
	async onCompleted(job, result) {
		// Override ở class con nếu cần
	}

	/**
	 * Lấy thông tin queue
	 */
	async getQueueInfo() {
		const counts = await this.queue.getJobCounts();
		return {
			queueName: this.queueName,
			active: counts.active,
			waiting: counts.waiting,
			completed: counts.completed,
			failed: counts.failed,
		};
	}

	/**
	 * Xoá tất cả job
	 */
	async clearQueue() {
		await this.queue.empty();
		console.log(`[🗑️ Queue Cleared] ${this.queueName}`);
	}
}

module.exports = BaseJob;
