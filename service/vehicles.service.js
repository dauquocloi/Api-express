const { vehicleStatus } = require('../constants/vehicle');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const { NotFoundError, InternalError, ConflictError } = require('../AppError');

exports.findById = (vehicleId) => Entity.VehiclesEntity.findById(vehicleId);

exports.getAllVehicles = async (buildingObjectId, status) => {
	let pipeline;
	if (status === 'active') {
		pipeline = Pipelines.vehicles.getAllVehicles(buildingObjectId);
	} else {
		pipeline = Pipelines.vehicles.getAllTerminatedVehicles(buildingObjectId);
	}
	const [vehicles] = await Entity.BuildingsEntity.aggregate(pipeline);

	return vehicles?.rooms ?? [];
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

exports.expiredVehicles = async ({ roomId, contractId }) => {
	const result = await Entity.VehiclesEntity.updateMany(
		{ room: roomId, contract: contractId },
		{ $set: { status: vehicleStatus['TERMINATED'] }, $inc: { version: 1 } },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy bản ghi');
	return result;
};

exports.importVehicles = async (vehiclesData) => {
	const result = await Entity.VehiclesEntity.insertMany(vehiclesData);
	return result;
};

exports.modifyVehicle = async ({ vehicleId, licensePlate, fromDate, status, image, version }) => {
	const result = await Entity.VehiclesEntity.findOneAndUpdate(
		{ _id: vehicleId, version },
		{ $set: { licensePlate, fromDate, status, image }, $inc: { version: 1 } },
		{ new: true },
	);
	if (!result) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng tải lại trang !');
	return result;
};
