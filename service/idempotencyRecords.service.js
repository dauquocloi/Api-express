const Entity = require('../models');
const { InternalError, ConflictError } = require('../AppError');
const { IDEMPOTENCY_RECORD_STATUS } = require('../constants');

exports.acquire = async ({ key, userId, endPoint, requestHash, resourceId }) => {
	const processingExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

	try {
		const record = await Entity.IdempotencyRecordsEntity.create({
			key,
			userId,
			endPoint,
			requestHash,
			resourceId,
			status: IDEMPOTENCY_RECORD_STATUS.PROCESSING,
			processingExpiresAt,
		});

		return {
			acquired: true,
			record,
		};
	} catch (error) {
		if (error.code !== 11000) {
			throw error;
		}
	}

	/*
	 * Record đã tồn tại
	 */

	const record = await Entity.IdempotencyRecordsEntity.findOne({
		key,
		userId,
		endPoint,
	});

	if (!record) {
		throw new InternalError('Failed to acquire idempotency record');
	}

	/*
	 * ---------------------------------------------
	 * Request hash khác
	 * ---------------------------------------------
	 */

	if (record.requestHash !== requestHash) {
		throw new ConflictError('Idempotency key has already been used with a different request');
	}

	switch (record.status) {
		case IDEMPOTENCY_RECORD_STATUS.SUCCESS:
			return {
				replay: true,
				record,
			};

		case IDEMPOTENCY_RECORD_STATUS.FAILED_FINAL:
			return {
				replay: true,
				record,
			};

		case IDEMPOTENCY_RECORD_STATUS.PROCESSING:
			/*
			 * Lease vẫn còn
			 */

			if (record.processingExpiresAt && record.processingExpiresAt > new Date()) {
				return {
					acquired: false,
					processing: true,
					record,
				};
			}

			/*
			 * Lease hết hạn.
			 *
			 * Request cũ có khả năng đã chết.
			 * Ta thử acquire lại bằng atomic update.
			 */
			break;

		case IDEMPOTENCY_RECORD_STATUS.FAILED_RETRYABLE:
			/*
			 * ---------------------------------------------
			 * FAILED_RETRYABLE
			 * hoặc PROCESSING đã expired
			 * ---------------------------------------------
			 */
			const claimed = await Entity.IdempotencyRecordsEntity.findOneAndUpdate(
				{
					_id: record._id,

					requestHash,

					$or: [
						{
							status: IDEMPOTENCY_RECORD_STATUS.FAILED_RETRYABLE,
						},
						{
							status: IDEMPOTENCY_RECORD_STATUS.PROCESSING,

							processingExpiresAt: {
								$lte: new Date(),
							},
						},
					],
				},
				{
					$set: {
						status: IDEMPOTENCY_RECORD_STATUS.PROCESSING,

						processingExpiresAt,
					},
				},
				{
					new: true,
				},
			);

			if (!claimed) {
				const latest = await Entity.IdempotencyRecordsEntity.findById(record._id);

				if (latest?.status === IDEMPOTENCY_RECORD_STATUS.PROCESSING) {
					return {
						acquired: false,
						processing: true,
						record: latest,
					};
				}

				if (latest?.status === IDEMPOTENCY_RECORD_STATUS.SUCCESS || latest?.status === IDEMPOTENCY_RECORD_STATUS.FAILED_FINAL) {
					return {
						acquired: false,
						replay: true,
						record: latest,
					};
				}

				throw new InternalError('Failed to acquire idempotency record');
			}

			return {
				acquired: true,
				record: claimed,
			};

		default:
			throw new InternalError(`Unknown idempotency status: ${record.status}`);
	}
};

exports.complete = async ({ recordId, responseCode, responseBody }) => {
	return Entity.IdempotencyRecordsEntity.findOneAndUpdate(
		{
			_id: recordId,
		},
		{
			$set: {
				status: IDEMPOTENCY_RECORD_STATUS.SUCCESS,
				responseCode,
				responseBody,
				processingExpiresAt: null,
			},
		},
		{
			new: true,
		},
	);
};

exports.fail = async ({ recordId, responseCode, responseBody }) => {
	return Entity.IdempotencyRecordsEntity.findOneAndUpdate(
		{
			_id: recordId,
		},
		{
			$set: {
				status: IDEMPOTENCY_RECORD_STATUS.FAILED_RETRYABLE,
				responseCode,
				responseBody,
				processingExpiresAt: null,
			},
		},
		{
			new: true,
		},
	);
};

exports.failFinal = async ({ recordId, responseCode, responseBody }) => {
	return Entity.IdempotencyRecordsEntity.findOneAndUpdate(
		{
			_id: recordId,
		},
		{
			$set: {
				status: IDEMPOTENCY_RECORD_STATUS.FAILED_FINAL,
				responseCode,
				responseBody,
				processingExpiresAt: null,
			},
		},
		{
			new: true,
		},
	);
};
