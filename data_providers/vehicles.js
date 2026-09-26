const mongoose = require('mongoose');
const uploadFile = require('../utils/uploadFile');
const getFileUrl = require('../utils/getFileUrl');
const deleteFile = require('../utils/deleteFileFromS3');
const Services = require('../service');
const { NotFoundError, BadRequestError, InternalError } = require('../AppError');
const { vehicleStatus } = require('../constants/vehicle');
const { isValidImage } = require('../utils/checkIsValidImage');

exports.getAll = async (buildingId, status) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const vehicles = await Services.vehicles.getAllVehicles(buildingObjectId, status);
	return vehicles;
};

exports.editVehicle = async (data) => {
	let currentVehicleImage = null;
	let vehicleImageUploaded = null;
	let result = {};
	try {
		const { vehicleId, licensePlate, fromDate, status, version, userId, image } = data;
		const currentVehicle = await Services.vehicles.findById(vehicleId).lean().exec();
		if (!currentVehicle) throw new NotFoundError('Dữ liệu không tồn tại');

		await Services.rooms.assertRoomWritable({ roomId: currentVehicle.room, userId });

		const modifiedVehicleData = {
			vehicleId: vehicleId,
			licensePlate: licensePlate,
			fromDate: fromDate,
			status: status,
			version: version,
		};

		if (image && isValidImage(image)) {
			const handleUploadFile = await uploadFile(image);
			currentVehicleImage = currentVehicle.image;
			result.image = handleUploadFile.url;

			vehicleImageUploaded = handleUploadFile.Key;
			modifiedVehicleData.image = handleUploadFile.Key;
		}

		const vehicleModified = await Services.vehicles.modifyVehicle(modifiedVehicleData);

		if (currentVehicleImage) {
			try {
				await deleteFile(currentVehicleImage);
			} catch (error) {
				console.error('Error deleting file:', error);
			}
		}

		result = {
			...result,
			_id: vehicleModified._id,
			licensePlate: vehicleModified.licensePlate,
			fromDate: vehicleModified.fromDate,
			status: vehicleModified.status,
			version: vehicleModified.version,
		};
		return result;
	} catch (error) {
		if (vehicleImageUploaded) {
			await deleteFile(vehicleImageUploaded);
		}
		throw error;
	}
};

exports.addVehicle = async (data, userId) => {
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

exports.getVehicleImage = async (vehicleId) => {
	const vehicle = await Services.vehicles.findById(vehicleId).lean().exec();
	if (!vehicle) throw new NotFoundError('Dữ liệu không tồn tại');
	if (!vehicle.image) return { image: '' };

	try {
		const url = await getFileUrl(vehicle.image);
		return { image: url };
	} catch (error) {
		return { image: '' };
	}
};
