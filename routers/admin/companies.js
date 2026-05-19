const UseCase = require('../../data_providers/admin');
const { SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { client: redis } = require('../../config').redisDb;

exports.createCompany = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of data from createCompany: ', data);
	const result = await UseCase.companies.createCompany(data);
	await redis.set(req.redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
	return new SuccessResponse('Success', result).send(res);
});
