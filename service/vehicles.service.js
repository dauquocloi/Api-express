const Entity = require('../models');
const Pipelines = require('./aggregates');
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
