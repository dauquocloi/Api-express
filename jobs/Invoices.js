const BaseJob = require('./BaseJob');
const Services = require('../service');
const Sentry = require('@sentry/node');

class LockInvoiceJob extends BaseJob {
	constructor() {
		super('lock-invoice');
	}

	async handle(payload) {
		const { invoiceId } = payload;
		const invoice = await Services.invoices.findById(invoiceId).lean().exec();
		if (!invoice || invoice.locked === true) return { success: true };
		await Services.invoices.lockInvoice(invoiceId);

		return {
			success: true,
		};
	}

	async onFailed(job, error) {
		console.error(`[lock-invoice Failed] Job #${job.id}`, {
			error: error.message,
			payload: job.data.payload,
			attemptsMade: job.attemptsMade,
			attemptsRemaining: job.opts.attempts - job.attemptsMade,
		});

		// Gửi alert lên Sentry với severity cao
		Sentry.captureException(error, {
			level: 'error',
			tags: {
				job: 'lock-invoice',
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

module.exports = { LockInvoiceJob };
