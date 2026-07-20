const { asyncHandler } = require('../../utils/asyncHandler');
const UseCase = require('../../data_providers/bankAccounts');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const { client: redis } = require('../../config').redisDb;

exports.createBankAccount = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of data from createBankAccount: ', data);
	const result = await UseCase.createBankAccount({
		accountNumber: data.accountNumber,
		accountName: data.accountName,
		bankId: data.bankId,
		buildingId: data.buildingId,
	});
	await redis.set(req.redisKey, `SUCCESS:${JSON.stringify(result)}`, 'EX', process.env.REDIS_EXP_SEC);
	return new SuccessResponse('Success', result).send(res);
});
