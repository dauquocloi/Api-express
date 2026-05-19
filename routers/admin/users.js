const UseCase = require('../../data_providers/admin');
const asyncHandler = require('../../utils/asyncHandler');
const { client: redis } = require('../../config').redisDb;
const { SuccessResponse } = require('../../utils/apiResponse');

exports.getUserDetail = asyncHandler(async (req, res) => {
	const data = req.query;
	const result = await UseCase.users.getUserDetail(data.phone);
	return new SuccessResponse('Success', result).send(res);
});

exports.createUser = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of data from create user: ', data);
	const result = await UseCase.users.createUser({
		fullName: data.fullName.trim(),
		phone: data.phone.trim(),
		dob: data.dob,
		cccd: data.cccd,
		cccdIssueDate: data.cccdIssueDate,
		cccdIssueAt: data.cccdIssueAt?.trim(),
		permanentAddress: data.permanentAddress?.trim(),
		role: data.role,
		gender: data.gender,
	});
	await redis.set(req.redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
	return new SuccessResponse('Success', result).send(res);
});
