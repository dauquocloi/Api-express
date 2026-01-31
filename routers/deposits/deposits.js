const UseCase = require('../../data_providers/deposits');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessMsgResponse, SuccessResponse } = require('../../utils/apiResponse');

exports.getDeposits = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of getDeposits', data);
	const result = await UseCase.getDeposits(data.buildingId);
	return new SuccessResponse('Success', result).send(res);
});

exports.createDeposit = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('log of data from createDeposit: ', data);
	const result = await UseCase.createDeposit(data, req.redisKey);
	return new SuccessResponse('Success', result).send(res);
});

exports.getDepositDetail = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('this is log of getDepositDetail: ', data);
	const result = await UseCase.getDepositDetail(data.depositId);
	return new SuccessResponse('Success', result).send(res);
});

exports.modifyDeposit = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('this is log of modifyDeposit: ', data);
	await UseCase.modifyDeposit(data, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.uploardDepositTerm = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.file };
	console.log('this is log of uploardDepositTerm: ', data);
	await UseCase.uploardDepositTerm(data);
	return new SuccessMsgResponse('Success').send(res);
});

exports.terminateDeposit = asyncHandler(async (req, res) => {
	let data = { ...req.params, ...req.body };
	console.log('this is log of terminateDeposit: ', data);
	await UseCase.terminateDeposit(data);
	return new SuccessMsgResponse('Success').send(res);
});

//================ UN REFACTORED ================//

exports.getDepositDetailByRoomId = (req, res, next) => {
	let data = req.params;
	console.log('this is log of getDepositDetailByRoomId: ', data);

	UseCase.getDepositDetailByRoomId(
		data,
		(error, result) => {
			if (!error) {
				res.status(200).json({
					errorCode: 0,
					data: result,
					message: 'succesfull',
					errors: [],
				});
			}
		},
		next,
	);
};
