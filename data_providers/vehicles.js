const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
const uploadFile = require('../utils/uploadFile');
const getFileUrl = require('../utils/getFileUrl');
const Services = require('../service');
var Entity = require('../models');
const { NotFoundError } = require('../AppError');
const redis = require('../config/redisClient');

exports.getAll = async (buildingId, status) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const vehicles = await Services.vehicles.getAllVehicles(buildingObjectId, status);
	return vehicles;
};

exports.editVehicle = async (data, redisKey) => {
	const curentVehicle = await Services.vehicles.findById(data.vehicleId);
	if (!curentVehicle) {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}
	let vehicleImage;
	if (data.vehicleImage != undefined) {
		const handleuploadFile = await uploadFile(data.vehicleImage?.buffer);
		vehicleImage = handleuploadFile.Key;
	} else {
		vehicleImage = data.image;
	}
	const vehicle = {
		licensePlate: data.licensePlate,
		fromDate: data.fromDate,
		// owner: data.owner, // should be cannot modified !!!
		image: vehicleImage,
		status: data.status,
	};
	Object.assign(curentVehicle, vehicle);
	const updatedVehicle = await vehicleRecent.save();

	await redis.set(redisKey, `SUCCESS:${JSON.stringify(updatedVehicle)}`, 'EX', process.env.REDIS_EXP_SEC);
	return updatedVehicle;
};

exports.addVehicle = async (data, redisKey) => {
	let customerObjectId = new mongoose.Types.ObjectId(`${data.customerId}`);
	let roomObjectId = new mongoose.Types.ObjectId(`${data.roomId}`);

	let image = '';
	if (data.vehicle && data.vehicle !== '') {
		image = await uploadFile(data.buffer);
		image = image.key;
	}

	const vehicle = {
		licensePlate: data.licensePlate,
		owner: customerObjectId,
		room: roomObjectId,
		fromDate: data.fromDate,
		status: 1,
		image: image,
	};

	let vehicleCreated = await Services.vehicles.createVehicle(vehicle);
	await redis.set(redisKey, `SUCCESS:${JSON.stringify(vehicleCreated)}`, 'EX', process.env.REDIS_EXP_SEC);
	return vehicleCreated;
};

exports.getVehicle = async (vehicleId) => {
	const vehicleObjectId = new mongoose.Types.ObjectId(vehicleId);

	const vehicle = await Services.vehicles.getVehicleDetail(vehicleObjectId);

	if (vehicle.image != undefined && vehicle.image != null && vehicle.image != '') {
		const url = await getFileUrl(vehicle.image);
		vehicle.url = url;
	}

	return vehicle;
};
