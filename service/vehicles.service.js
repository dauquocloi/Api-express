const { vehicleStatus } = require('../constants/vehicle');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.findById = (vehicleId) => Entity.VehiclesEntity.findById(vehicleId);

exports.getAllVehicles = async (buildingObjectId, status) => {
	const [vehicles] = await Entity.BuildingsEntity.aggregate(Pipelines.vehicles.getAllVehicles(buildingObjectId, status));

	return vehicles?.data ?? [];
};
exports.createVehicle = async ({ licensePlate, owner, room, fromDate, status, image }) => {
	const vehicle = await Entity.VehiclesEntity.create({ licensePlate, owner, room, fromDate, status, image });
	return vehicle.toObject();
};

exports.getVehicleDetail = async (vehicleObjectId) => {
	const [vehicleInfo] = await Entity.VehiclesEntity.aggregate(Pipelines.vehicles.getVehicleDetail(vehicleObjectId));
	if (!vehicleInfo) throw new NotFoundError('Xe khÔng tồn tại');
	return vehicleInfo;
};

exports.expiredVehicles = async ({ roomId, contractId }, session) => {
	const result = await Entity.VehiclesEntity.updateMany(
		{ room: roomId, contract: contractId },
		{ $set: { status: vehicleStatus['TERMINATED'] } },
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy bản ghi');
	return result;
};

exports.importVehicles = async (vehiclesData, session) => {
	const result = await Entity.VehiclesEntity.insertMany(vehiclesData, { session });
	return result;
};
