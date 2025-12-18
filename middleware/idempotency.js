const redis = require('../config').redis;

module.exports = async function checkIdempotency(req, res, next) {
	const idempotencyKey = req.body?.idempotencyKey;
	console.log('log of idempotencyKey from idem middleware: ', idempotencyKey);

	if (!idempotencyKey) {
		return res.status(400).json({ message: 'idempotency-key is required' });
	}

	const redisKey = `idem:${idempotencyKey}`;

	const existing = await redis.get(redisKey);
	console.log('Log of existing from idem middleware: ', existing);

	if (existing === 'PROCESSING') {
		return res.status(202).json({
			message: 'Request is still processing. Try again shortly.',
		});
	}

	if (existing && existing.startsWith('SUCCESS:')) {
		const data = JSON.parse(existing.replace('SUCCESS:', ''));
		console.log('log of existingData from idem middleware: ', data);
		return res.status(200).json({
			message: 'Already processed',
			data,
		});
	}

	// Không có → set PROCESSING với TTL 5 phút
	await redis.set(redisKey, 'PROCESSING', 'EX', 300);

	req.idempotencyKey = idempotencyKey;
	req.redisKey = redisKey;

	next();
};
