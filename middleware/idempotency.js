const { client } = require('../config').redisDb;
const { BadRequestError } = require('../AppError');
const { ProcessingResponse, SuccessResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { IDEMPOTENCY_RECORD_STATUS } = require('../constants');

exports.checkIdempotency = asyncHandler(async (req, res, next) => {
	const idempotencyKey = req.get('Idempotency-Key');
	console.log('idempotencyKey', idempotencyKey);

	if (!idempotencyKey) {
		throw new BadRequestError('Idempotency-Key is required');
	}

	// req.idempotencyKey = idempotencyKey;

	next();
});
