const { SuccessResponse, SuccessMsgResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const UseCase = require('../../data_providers/vehicles');
const delay = require('../../utils/delay');

exports.getAll = asyncHandler(async (req, res) => {
	const data = req.query;
	console.log('log of data from getAll vehicle: ', data);
	const result = await UseCase.getAll(data.buildingId, data.status);
	return new SuccessResponse('Success', result).send(res);
});

exports.editVehicle = asyncHandler(async (req, res) => {
	const { vehicleId } = req.params;
	const { licensePlate, fromDate, status, version } = req.body;
	const vehicleImage = req.file;

	const data = {
		vehicleId,
		licensePlate: licensePlate.trim(),
		fromDate,
		status,
		version,
		userId: req.user._id,
		image: vehicleImage || null,
	};
	console.log('log of data from editVehicle: ', data);
	const result = await UseCase.editVehicle(data);
	return new SuccessResponse('Success', result).send(res);
});

exports.addVehicle = asyncHandler(async (req, res) => {
	const data = { ...req.params, ...req.body, image: req.file };
	console.log('log of data from addVehicle: ', data);
	await UseCase.addVehicle(data, req.user._id);
	return new SuccessMsgResponse('Success').send(res);
});

exports.getVehicle = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from getVehicle: ', data);
	const result = await UseCase.getVehicle(data.vehicleId);
	return new SuccessResponse('Success', result).send(res);
});

exports.getVehicleImage = asyncHandler(async (req, res) => {
	const data = req.params;
	console.log('log of data from getVehicleImage: ', data);
	const result = await UseCase.getVehicleImage(data.vehicleId);
	return new SuccessResponse('Success', result).send(res);
});
