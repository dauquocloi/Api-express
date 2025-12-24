const { NotFoundError, ConflictError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const { ROOM_LOCK_TTL_MS, LOCK_REASON } = require('../constants/rooms');

const findById = async (roomId) => {
	return await Entity.RoomsEntity.findById(roomId).lean().exec();
};

const getAllRooms = async (buildingId) => {
	const [rooms] = await Entity.BuildingsEntity.aggregate(Pipelines.rooms.getAllByBuildingPipeline(buildingId));
	if (!rooms) throw new NoDataError('Không có dữ liệu');
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

const getRoomInfo = async (roomId, session) => {
	const query = Entity.RoomsEntity.findById(roomId);
	if (session) query.session(session);

	const roomInfo = await query.lean().exec();
	if (!roomInfo) throw new NotFoundError('Phòng không tồn tại');
	return roomInfo;
};

const bumpRoomVersion = async (roomId, version, session) => {
	const bumpRoomVersion = await Entity.RoomsEntity.updateOne({ _id: roomId, version: version }, { $inc: { version: 1 } }, { new: true, session });
	if (bumpRoomVersion.n === 0) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng reload trang');
	return bumpRoomVersion;
};

const bumpRoomVersionBlind = async (roomId, session) => {
	const result = await Entity.RoomsEntity.updateOne({ _id: roomId }, { $inc: { version: 1 } }, { session });

	if (result.matchedCount === 0) {
		throw new NotFoundError('Phòng không tồn tại');
	}

	return result;
};

const getRoomLockInfo = async (roomId, session) => {
	const query = Entity.RoomsEntity.findById(roomId);
	if (session) query.session(session);

	const room = await query.lean().exec();
	if (!room) throw new NotFoundError('Phòng không tồn tại');

	return room.writeLock;
};

const setWriteLockedRoom = async (roomId, session, lockReason, lockOwner) => {
	const now = new Date();
	const expireAt = new Date(now.getTime() + ROOM_LOCK_TTL_MS);
	const lockResult = await Entity.RoomsEntity.updateOne(
		{
			_id: roomId,
			$or: [
				{ 'writeLock.locked': { $ne: true } },
				{ 'writeLock.expAt': { $lte: now } }, // lock cũ hết hạn
				{ 'writeLock.ownerId': { $eq: lockOwner } },
			],
		},
		{
			$set: {
				'writeLock.ownerId': lockOwner,
				'writeLock.locked': true,
				'writeLock.lockedAt': now,
				'writeLock.expAt': expireAt,
				'writeLock.reason': lockReason || LOCK_REASON['GET_FEES_AND_DEBTS'],
			},
		},
		{ session },
	);
	if (lockResult.n === 0) {
		throw new ConflictError('Phòng đang được xử lý công nợ, vui lòng thử lại sau');
	}

	return {
		roomLocked: true,
		lockExpireAt: expireAt,
	};
};

const unLockedRoom = async (roomId, session) => {
	const now = new Date();
	const unlockResult = await Entity.RoomsEntity.updateOne(
		{ _id: roomId },
		{
			$set: {
				'writeLock.locked': false,
				'writeLock.expAt': now,
				'writeLock.reason': '',
			},
		},
		{ session },
	);

	if (unlockResult.n === 0) {
		throw new ConflictError('Phòng đang được xử lý công nợ');
	}
	return 'Success';
};

const assertRoomWritable = async ({ roomId, userId, session = null }) => {
	const now = new Date();

	const query = Entity.RoomsEntity.findById(roomId).select('writeLock');

	if (session) query.session(session);

	const room = await query.lean();
	if (!room) throw new NotFoundError('Phòng không tồn tại');

	const { locked, expAt, ownerId } = room.writeLock || {};

	if (locked === true && expAt > now && String(ownerId) !== String(userId)) {
		throw new ConflictError('Phòng hiện đang được quản lý cập nhật !');
	}

	return room.writeLock;
};

module.exports = {
	getAllRooms,
	getRoom,
	addInterior,
	modifyInterior,
	getRoomInfo,
	findById,
	getRoomLockInfo,
	bumpRoomVersion,
	bumpRoomVersionBlind,
	setWriteLockedRoom,
	unLockedRoom,
	assertRoomWritable,
};
