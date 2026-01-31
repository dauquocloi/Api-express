const redis = require('../config').redis;
const { BadRequestError } = require('../AppError');
const { ProcessingResponse, SuccessResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

exports.checkIdempotency = asyncHandler(async (req, res, next) => {
	const idempotencyKey = req.get('Idempotency-Key');
	console.log('log of idempotencyKey from idem middleware: ', idempotencyKey);

	if (!idempotencyKey) {
		throw new BadRequestError('Idempotency-Key is required');
	}

	const redisKey = `idem:${idempotencyKey}`;

	const isSet = await redis.set(redisKey, 'PROCESSING', 'EX', process.env.REDIS_EXP_SEC, 'NX');

	if (!isSet) {
		const existing = await redis.get(redisKey);
		console.log('Log of existing from idem middleware: ', existing);

		if (existing === 'PROCESSING') {
			return new ProcessingResponse('Request is still processing. Try again shortly.').send(res);
		}

		if (existing?.startsWith('SUCCESS:')) {
			const data = JSON.parse(existing.replace('SUCCESS:', '')) || {};
			return new SuccessResponse('Success', data).send(res);
		}
	}

	req.idempotencyKey = idempotencyKey;
	req.redisKey = redisKey;

	next();
});
