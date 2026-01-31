const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const UseCase = require('../../data_providers/vehicles');

exports.getAll = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of data from getAll vehicle: ', req.params);
	const result = await UseCase.getAll(data.buildingId, Number(data.status));
	return new SuccessResponse('Success', result).send(res);
});

exports.editVehicle = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body };
	console.log('log of data from editVehicle: ', data);
	await UseCase.editVehicle(data, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.addVehicle = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body, ...req.file };
	console.log('log of data from addVehicle: ', data);
	await UseCase.addVehicle(data, req.redisKey);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getVehicle = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from getVehicle: ', data);
	const result = await UseCase.getVehicle(data.vehicleId);
	return new SuccessResponse('Success', result).send(res);
});
