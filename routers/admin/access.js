const UseCase = require('../../data_providers/admin');
const { SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

exports.login = asyncHandler(async (req, res) => {
	const data = req.body;
	console.log('log of data from login: ', data);
	const result = await UseCase.access.login(data);
	return new SuccessResponse('Success', result).send(res);
});
