const BaseJob = require('./BaseJob');
const Services = require('../service');
const Sentry = require('@sentry/node');

class LockReceiptsJob extends BaseJob {
	constructor() {
		super('lock-receipts');
	}

	async handle(payload) {
		const { receiptIds } = payload;
		const receipts = await Services.receipts.findReceipts(receiptIds).lean().exec();
		if (receipts?.length === 0) return { success: true };
		await Services.receipts.lockReceipts(receiptIds);

		return {
			success: true,
		};
	}

	async onFailed(job, error) {
		console.error(`[lock-receipts Failed] Job #${job.id}`, {
			error: error.message,
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			attemptsRemaining: job.opts.attempts - job.attemptsMade,
		});

		// Gửi alert lên Sentry với severity cao
		Sentry.captureException(error, {
			level: 'error',
			tags: {
				job: 'lock-receipts',
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
	}
}

module.exports = { LockReceiptsJob };
