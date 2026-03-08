const mongoose = require('mongoose');
const uploadFile = require('../utils/uploadFile');
const getFileUrl = require('../utils/getFileUrl');
const Services = require('../service');
const { NotFoundError, BadRequestError } = require('../AppError');
const redis = require('../config/redisClient');
const { vehicleStatus } = require('../constants/vehicle');
const { isValidImage } = require('../utils/checkIsValidImage');

exports.getAll = async (buildingId, status) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const vehicles = await Services.vehicles.getAllVehicles(buildingObjectId, status);
	return vehicles;
};

exports.editVehicle = async (data, redisKey, userId) => {
	const currentVehicle = await Services.vehicles.findById(data.vehicleId).lean().exec();
	if (!currentVehicle) {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}
	await Services.rooms.assertRoomWritable({ roomId: currentVehicle.room, userId });

	const vehicle = {
		licensePlate: data.licensePlate,
		fromDate: data.fromDate,
		status: data.status,
		version: currentVehicle.version,
	};
	if (data.vehicleImage && isValidImage(data.vehicleImage)) {
		const handleuploadFile = await uploadFile(data.vehicleImage);
		vehicle.image = handleuploadFile.Key;
	}

	await Services.vehicles.modifyVehicle(vehicle);

	await redis.set(redisKey, `SUCCESS:${JSON.stringify(vehicle)}`, 'EX', process.env.REDIS_EXP_SEC);
	return vehicle;
};

exports.addVehicle = async (data, redisKey, userId) => {
	let customerObjectId = new mongoose.Types.ObjectId(data.customerId);
	const currentCustomer = await Services.customers.findById(customerObjectId).lean().exec();
	if (!currentCustomer) throw new BadRequestError('Không tìm thấy thông tin chủ xe !');
	if (currentCustomer.status === 0) throw new BadRequestError('Không thể thêm xe cho khách đã dọn đi !');

	await Services.rooms.assertRoomWritable({ roomId: currentCustomer.room, userId });

	let image = '';
	if (data.image && isValidImage(data.image)) {
		image = await uploadFile(data.image);
		image = image.Key;
	}

	const vehicle = {
		licensePlate: data.licensePlate,
		owner: customerObjectId,
		room: currentCustomer.room,
		fromDate: data.fromDate,
		status: vehicleStatus['ACTIVE'],
		image: image,
		contract: currentCustomer.contract,
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
		vehicle.image = url;
	}

	return vehicle;
};
