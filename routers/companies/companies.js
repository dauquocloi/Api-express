const UseCase = require('../../data_providers/companies');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const { client: redis } = require('../../config').redisDb;

exports.getCompanyPermissions = asyncHandler(async (req, res) => {
	const data = req.user;
	console.log('log of getCompanyPermissions', data);
	const result = await UseCase.getCompanyPermissions(data._id);
	return new SuccessResponse('Success', result).send(res);
});

exports.setCompanyPermission = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of data from setCompanyPermission: ', data);
	const result = await UseCase.setCompanyPermission(req.user._id, data.permission, data.enabled, data.version);
	await redis.set(req.redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
	return new SuccessResponse('Success', result).send(res);
});
