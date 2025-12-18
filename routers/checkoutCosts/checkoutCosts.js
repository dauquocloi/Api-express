const UseCase = require('../../data_providers/checkoutCosts');
const asyncHandler = require('../../utils/asyncHandler');
const { SuccessResponse } = require('../../utils/apiResponse');

exports.getCheckoutCost = asyncHandler(async (req, res) => {
	let data = req.params;
	console.log('log of data from getCheckoutCost: ', data);
	const result = await UseCase.getCheckoutCost(data.checkoutCostId);
	return new SuccessResponse('Success', result).send(res);
});
