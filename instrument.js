// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require('@sentry/node');

Sentry.init({
	dsn: 'https://5d3d4acb285bbd7291cb3a88e7efb495@o4510077493313536.ingest.us.sentry.io/4510077497442304',
	// Setting this option to true will send default PII data to Sentry.
	// For example, automatic IP address collection on events
	beforeSend(event, hint) {
		const error = hint.originalException;

		if (error instanceof AppError) {
			return null; // return null => không gửi lên Sentry
		}

		if (error.statusCode && [400, 404].includes(error.statusCode)) {
			return null;
		}

		return event;
	},
});
