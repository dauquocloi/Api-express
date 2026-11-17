const { BadRequestError } = require('../AppError');
const asyncHandler = require('../utils/asyncHandler');

exports.checkIdempotency = asyncHandler(async (req, res, next) => {
	const idempotencyKey = req.get('Idempotency-Key');
	console.log('idempotencyKey', idempotencyKey);

	if (!idempotencyKey) {
		throw new BadRequestError('Idempotency-Key is required');
	}

	next();
});
