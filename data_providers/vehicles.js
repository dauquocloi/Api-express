const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
const uploadFile = require('../utils/uploadFile');
const getFileUrl = require('../utils/getFileUrl');
const Services = require('../service');
var Entity = require('../models');
const { NotFoundError } = require('../AppError');

exports.getAll = async (buildingId, status) => {
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);
	const vehicles = await Services.vehicles.getAllVehicles(buildingObjectId, status);
	return vehicles;
};

exports.editVehicle = async (data) => {
	let vehicleRecent = await Entity.VehiclesEntity.findById(data.vehiclesId);
	if (!vehicleRecent) {
		throw new NotFoundError('Xe không tồn tại');
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
	Object.assign(vehicleRecent, vehicle);
	const updatedVehicle = await vehicleRecent.save();
	return updatedVehicle;
};

exports.addVehicle = async (data) => {
	let customerObjectId = mongoose.Types.ObjectId(`${data.customerId}`);
	let roomObjectId = mongoose.Types.ObjectId(`${data.roomId}`);

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
	return vehicleCreated;
};

exports.getVehicle = async (vehicleId) => {
	const vehicleObjectId = mongoose.Types.ObjectId(vehicleId);

	const vehicle = await Services.vehicles.getVehicleDetail(vehicleObjectId);

	if (vehicle.image != undefined && vehicle.image != null && vehicle.image != '') {
		const url = await getFileUrl(vehicle.image);
		vehicle.url = url;
	}

	return vehicle;
};
