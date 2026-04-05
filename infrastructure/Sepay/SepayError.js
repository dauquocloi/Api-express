const Sentry = require('@sentry/node');

class SepayError extends Error {
	constructor({ type, message, raw } = {}) {
		super(message || 'Unknown Sepay error');
		this.name = 'SepayError';
		this.type = type || sepayErrorTypes.UNKNOWN_ERROR;
		this.raw = raw;

		Error.captureStackTrace(this, this.constructor);
	}

	static handle(err, context = {}) {
		switch (err.type) {
			case sepayErrorTypes.UNKNOWN_ERROR:
			case sepayErrorTypes.UNKNOWN_BANK_NUMBER:
			case sepayErrorTypes.INVOICE_PAID:
			case sepayErrorTypes.UNKNOWN_CONTENT:
			case sepayErrorTypes.DUPLICATE_TRANSACTION:
				Sentry.captureException(err, {
					level: 'error',
					tags: {
						provider: 'sepay',
						type: err.type,
						...context.tags,
					},
					extra: {
						...context.extra,
						raw: err.raw,
					},
				});
				break;

			default:
				console.error('Unhandled SepayError: ', err);
				break;
		}
	}
}

const sepayErrorTypes = {
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	UNKNOWN_BANK_NUMBER: 'UNKNOWN_BANK_NUMBER',
	INVOICE_PAID: 'INVOICE_PAID',
	UNKNOWN_CONTENT: 'UNKNOWN_CONTENT',
	DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
};

module.exports = {
	SepayError,
	sepayErrorTypes,
};
