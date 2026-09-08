const { errorTypes } = require('../AppError');

const retryableErrorTypes = [errorTypes.internal, errorTypes.accessToken];

exports.isRetryableError = (error) => {
	if (error.retryable === true) {
		return true;
	}

	/*
	 * Mongo / network / infrastructure errors
	 */

	if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
		return true;
	}

	/*
	 * HTTP 5xx
	 */

	if (typeof error.statusCode === 'number' && error.statusCode >= 500) {
		return true;
	}

	if (retryableErrorTypes.includes(error.type)) {
		return true;
	}
	return false;
};
