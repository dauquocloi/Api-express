const { client: redis } = require('../config').redisDb;

module.exports = (execution) => async (req, res, next) => {
	try {
		await execution(req, res, next);
	} catch (error) {
		if (req.redisKey) {
			await redis.set(req.redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		}

		next(error);
	}
};
