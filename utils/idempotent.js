const Services = require('../service');
const { IDEMPOTENCY_RECORD_STATUS } = require('../constants');
const { isRetryableError } = require('./retryableError');
const { ConflictError, AppError, InternalError } = require('../AppError');
const mongoose = require('mongoose');

exports.executeIdempotent = async ({ key, userId, endPoint, requestHash, resourceId, execute }) => {
	const acquisition = await Services.idempotencyRecords.acquire({
		key,
		userId,
		endPoint,
		requestHash,
		resourceId,
	});

	/*
	 * -------------------------------------
	 * SUCCESS → replay
	 * -------------------------------------
	 */

	if (acquisition.replay) {
		const record = acquisition.record;

		/*
		 * SUCCESS
		 */
		if (record.status === IDEMPOTENCY_RECORD_STATUS.SUCCESS) {
			return record.responseBody;
		}

		/*
		 * FAILED_FINAL
		 */
		if (record.status === IDEMPOTENCY_RECORD_STATUS.FAILED_FINAL) {
			throw AppError.fromJSON(record.responseBody);
		}
	}

	/*
	 * -------------------------------------
	 * PROCESSING → duplicate
	 * -------------------------------------
	 */

	if (acquisition.processing) {
		throw new ConflictError('Request is already being processed');
	}

	/*
	 * -------------------------------------
	 * execution business logic
	 * -------------------------------------
	 */

	try {
		return await mongoose.connection.transaction(async () => {
			const result = await execute();

			await Services.idempotencyRecords.complete({
				recordId: acquisition.record._id,
				responseCode: result.statusCode ?? 200,
				responseBody: result.body ?? result,
			});

			throw new InternalError('Stop for testing');

			return result;
		});
	} catch (error) {
		const retryable = isRetryableError(error);

		const responseCode = error.statusCode ?? 500;

		const responseBody =
			typeof error.toJSON === 'function'
				? error.toJSON()
				: {
						code: error.code ?? 'INTERNAL_ERROR',
						message: error.message ?? 'Internal server error',
				  };

		if (retryable) {
			const updated = await Services.idempotencyRecords.fail({
				recordId: acquisition.record._id,
				responseCode,
				responseBody,
			});

			if (!updated) {
				throw new InternalError('Failed to mark idempotency record as FAILED_RETRYABLE');
			}

			throw error;
		}

		const updated = await Services.idempotencyRecords.failFinal({
			recordId: acquisition.record._id,
			responseCode,
			responseBody,
		});

		if (!updated) {
			throw new InternalError('Failed to mark idempotency record as FAILED_FINAL');
		}

		throw error;
	}
};
