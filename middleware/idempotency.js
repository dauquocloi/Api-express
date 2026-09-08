const { client } = require('../config').redisDb;
const { BadRequestError } = require('../AppError');
const { ProcessingResponse, SuccessResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { IDEMPOTENCY_RECORD_STATUS } = require('../constants');

exports.checkIdempotency = asyncHandler(async (req, res, next) => {
	const idempotencyKey = req.get('Idempotency-Key');

	if (!idempotencyKey) {
		throw new BadRequestError('Idempotency-Key is required');
	}

	const redisKey = `idem:${idempotencyKey}`;

	const cached = await client.get(redisKey);

	if (cached) {
		if (cached.status === IDEMPOTENCY_RECORD_STATUS['SUCCESS']) {
			return new SuccessResponse('Success', JSON.parse(cached.body)).send(res);
		}
		if (cached.status === IDEMPOTENCY_RECORD_STATUS['PROCESSING']) {
			return new ProcessingResponse('Processing', JSON.parse(cached.body)).send(res);
		}
	}

	req.idempotencyKey = idempotencyKey;
	req.redisKey = redisKey;

	next();
});
