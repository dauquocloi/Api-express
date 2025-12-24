const UseCase = require('../../data_providers/revenues');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');

exports.getRevenues = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.query };
	console.log('log of getRevenues', data);
	const result = await UseCase.getRevenues(data);
	return new SuccessResponse('Success', result).send(res);
});

exports.getTotalFeeRevenue = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of getTotalFeeRevenue: ', data);
	const result = await UseCase.getTotalFeeRevenue(data);
	return new SuccessResponse('Success', result).send(res);
});
