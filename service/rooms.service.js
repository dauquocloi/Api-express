const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const getAllRooms = async (buildingId) => {
	const rooms = await Entity.BuildingsEntity.aggregate(Pipelines.rooms.getAllByBuildingPipeline(buildingId));
	if (!rooms || rooms?.length === 0) throw new NoDataError('Không có dữ liệu');
	return rooms;
};

const getRoom = async (roomId) => {
	const [roomInfo] = await Entity.RoomsEntity.aggregate(Pipelines.rooms.getRoomByIdPipeline(roomId));
	if (!roomInfo) throw new NotFoundError('Phòng không tồn tại');
	else return roomInfo;
};

const addInterior = async (roomId, interior) => {
	const newInterior = await Entity.RoomsEntity.findByIdAndUpdate(roomId, { $push: { interior: interior } }, { new: true });
	if (!newInterior) throw new NotFoundError('Phòng cần thêm không tồn tại');
	return newInterior;
};

const modifyInterior = async (roomId, inteiorId, interior) => {
	const modifyInterior = await Entity.RoomsEntity.findOneAndUpdate(
		{
			_id: roomId,
			'interior._id': inteiorId,
		},
		{
			$set: {
				'interior.$.interiorName': interior.interiorName,
				'interior.$.quantity': interior.interiorQuantity,
				'interior.$.interiorRentalDate': interior.interiorRentalDate,
			},
		},
		{ new: true },
	);
	if (modifyInterior != null) {
		return interior;
	} else {
		throw new NotFoundError('Nội thất không tồn tại');
	}
};

module.exports = { getAllRooms, getRoom, addInterior, modifyInterior };
