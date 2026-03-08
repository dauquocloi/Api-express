const { vehicleStatus } = require('../constants/vehicle');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const { NotFoundError, InternalError } = require('../AppError');

exports.findById = (vehicleId) => Entity.VehiclesEntity.findById(vehicleId);

exports.getAllVehicles = async (buildingObjectId, status) => {
	const [vehicles] = await Entity.BuildingsEntity.aggregate(Pipelines.vehicles.getAllVehicles(buildingObjectId, status));

	return vehicles?.data ?? [];
};
exports.createVehicle = async ({ licensePlate, owner, room, fromDate, status, image, contract }) => {
	const vehicle = await Entity.VehiclesEntity.create({ licensePlate, owner, room, fromDate, status, image, contract });
	if (!vehicle) throw new InternalError('Đã xảy ra lỗi trong quá trình thêm xe');
	return vehicle.toObject();
};

exports.getVehicleDetail = async (vehicleObjectId) => {
	const [vehicleInfo] = await Entity.VehiclesEntity.aggregate(Pipelines.vehicles.getVehicleDetail(vehicleObjectId));
	if (!vehicleInfo) throw new NotFoundError('Dữ liệu không tồn tại');
	return vehicleInfo;
};

exports.expiredVehicles = async ({ roomId, contractId }, session) => {
	const result = await Entity.VehiclesEntity.updateMany(
		{ room: roomId, contract: contractId },
		{ $set: { status: vehicleStatus['TERMINATED'] }, $inc: { version: 1 } },
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy bản ghi');
	return result;
};

exports.importVehicles = async (vehiclesData, session) => {
	const result = await Entity.VehiclesEntity.insertMany(vehiclesData, { session });
	return result;
};

exports.modifyVehicle = async ({ vehicleId, licensePlate, fromDate, status, image }, sesison = null) => {
	const result = await Entity.VehiclesEntity.updateOne(
		{ _id: vehicleId },
		{ $set: { licensePlate, fromDate, status, image }, $inc: { version: 1 } },
		{ sesison },
	);
	if (!result || result.matchedCount === 0) throw new NotFoundError('Dữ liệu không tồn tại');
	return true;
};
