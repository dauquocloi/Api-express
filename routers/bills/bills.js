const UseCase = require('../../data_providers/clients/bills');
const { SuccessResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

exports.getBillInfo = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from getBillInfo: ', data);
	const result = await UseCase.getInvoiceInfoByInvoiceCode(data.billCode);
	return new SuccessResponse('Success', result).send(res);
});
