const { NotFoundError, ConflictError, NoDataError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const { ROOM_LOCK_TTL_MS, LOCK_REASON, roomState } = require('../constants/rooms');
const { depositStatus } = require('../constants/deposits');
const { CUSTOMER_FROM } = require('../constants/customers');

const findById = (roomId) => {
	return Entity.RoomsEntity.findById(roomId);
};

const getAllRooms = async (buildingId) => {
	const [rooms] = await Entity.BuildingsEntity.aggregate(Pipelines.rooms.getAllByBuildingPipeline(buildingId));
	if (!rooms) throw new NoDataError('Không có dữ liệu');
	return rooms;
};

const getRoom = async (roomId) => {
	const [roomInfo] = await Entity.RoomsEntity.aggregate(Pipelines.rooms.getRoomByIdPipeline(roomId));
	if (!roomInfo) throw new NotFoundError('Phòng không tồn tại');
	return roomInfo;
};

const addInterior = async (roomId, interior) => {
	const newInterior = await Entity.RoomsEntity.findByIdAndUpdate(roomId, { $push: { interior: interior } }, { new: true });
	if (!newInterior) throw new NotFoundError('Phòng không tồn tại');
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
				'interior.$.interiorRentalDate': interior.interiorRentalDate || new Date(),
			},
		},
		{ new: true },
	);
	if (modifyInterior != null) {
		return interior;
	} else {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}
};

const removeInterior = async ({ interiorId, roomId }) => {
	const result = await Entity.RoomsEntity.findOneAndUpdate(
		{ 'interior._id': interiorId, _id: roomId },
		{ $pull: { interior: { _id: interiorId } } },
		{ new: true, runValidators: true },
	);

	if (!result) throw new NotFoundError('Dữ liệu không tồn tại');
	return result;
};

const getRoomInfo = async (roomId, session) => {
	const query = Entity.RoomsEntity.findById(roomId);
	if (session) query.session(session);

	const roomInfo = await query.lean().exec();
	if (!roomInfo) throw new NotFoundError('Phòng không tồn tại');
	return roomInfo;
};

const bumpRoomVersion = async (roomId, version) => {
	const bumpRoomVersion = await Entity.RoomsEntity.updateOne({ _id: roomId, version: version }, { $inc: { version: 1 } }, { new: true });
	if (bumpRoomVersion.matchedCount === 0) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng reload trang');
	return bumpRoomVersion;
};

const bumpRoomVersionBlind = async (roomId) => {
	const result = await Entity.RoomsEntity.updateOne({ _id: roomId }, { $inc: { version: 1 } });

	if (result.matchedCount === 0) {
		throw new NotFoundError('Phòng không tồn tại');
	}
};

const getRoomLockInfo = async (roomId, session) => {
	const query = Entity.RoomsEntity.findById(roomId);
	if (session) query.session(session);

	const room = await query.lean().exec();
	if (!room) throw new NotFoundError('Phòng không tồn tại');

	return room.writeLock;
};

const setWriteLockedRoom = async (roomId, lockReason, lockOwner) => {
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
	);
	if (lockResult.matchedCount === 0) {
		throw new ConflictError('Phòng hiện đang được cập nhật, vui lòng thử lại sau !');
	}

	return {
		roomLocked: true,
		lockExpireAt: expireAt,
	};
};

const unLockedRoom = async (roomId) => {
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
	);

	if (unlockResult.matchedCount === 0) {
		throw new ConflictError('Phòng đang được xử lý công nợ');
	}
	return 'Success';
};

const assertRoomWritable = async ({ roomId, userId }) => {
	const now = new Date();
	const room = await Entity.RoomsEntity.findById(roomId).lean().exec();

	if (!room || !room._id) throw new NotFoundError('Phòng không tồn tại');

	const { locked, expAt, ownerId } = room.writeLock || {};

	if (locked === true && expAt > now && String(ownerId) !== String(userId)) {
		throw new ConflictError('Hiện tại phòng đang được cập nhật, vui lòng thử lại sau !');
	}

	return room;
};

const checkRoomDeposited = async (roomId, session) => {
	const result = await Entity.DepositsEntity.findOne({ room: roomId, status: { $in: [depositStatus['PAID'], depositStatus['PARTIAL']] } })
		.session(session)
		.lean()
		.exec();
	if (result) return true;
	return false;
};

const updateRoomState = async ({ roomId, roomState }) => {
	const result = await Entity.RoomsEntity.findOneAndUpdate(
		{ _id: roomId },
		{ $set: { roomState: roomState }, $inc: { version: 1 } },
		{ new: true },
	);

	if (!result) {
		throw new NotFoundError('Phòng không tồn tại');
	}

	return result;
};

const setRoomDeposited = async ({ roomId, isDeposited }) => {
	const result = await Entity.RoomsEntity.updateOne({ _id: roomId }, { $set: { isDeposited: isDeposited }, $inc: { version: 1 } });
	if (result.matchedCount === 0) throw new ConflictError('Phòng không tồn tại ');
	return 'Success';
};

const generateRoomHistory = async ({
	roomId,
	contractId,
	contractCode,
	contractSignDate,
	contractEndDate,
	depositAmount,
	checkoutDate,
	checkoutType,
	checkoutCostId,
	depositRefundId,
	interiors,
	fees,
	rent,
}) => {
	const result = await Entity.RoomHistoriesEntity.create({
		contract: {
			contractId,
			contractCode,
			depositAmount,
			contractSignDate,
			contractEndDate,
		},
		room: roomId,
		checkoutDate: checkoutDate,
		customerFrom: CUSTOMER_FROM['UNKNOWN'],
		checkoutType: checkoutType,
		checkoutCost: checkoutCostId,
		depositRefund: depositRefundId,
		interiors: interiors,
		fees: fees,
		rent: rent,
	});

	return result.toObject();
};

const completeChangeRoomState = async ({ roomId, roomVersion }) => {
	const result = await Entity.RoomsEntity.updateOne(
		{ _id: roomId, version: roomVersion },
		{
			$set: {
				'writeLock.locked': false,
				'writeLock.expAt': new Date(),
				'writeLock.reason': '',
				roomState: roomState['UN_HIRED'],
			},
			$inc: { version: 1 },
		},
	);

	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu của phòng đã bị ai đó thay đổi !');
	return result;
};

const getRoomHistories = async (roomObjectId) => {
	const result = await Entity.RoomHistoriesEntity.aggregate(Pipelines.rooms.getRoomHistoriesByRoomId(roomObjectId));
	return result;
};

const getRoomHistoryDetail = async (roomHistoryObjectId) => {
	const [result] = await Entity.RoomHistoriesEntity.aggregate(Pipelines.rooms.getRoomHistoryDetail(roomHistoryObjectId));
	if (!result) throw new NotFoundError('Dữ liệu không tồn tại');
	return result;
};

const importRooms = async (roomData) => {
	const result = await Entity.RoomsEntity.insertMany(roomData);
	return result;
};

const lockAllRoomsForSettlement = async (buildingId, ownerId, expAt) => {
	const now = new Date();

	const expiredAt = expAt instanceof Date ? expAt : new Date(now.getTime() + ROOM_LOCK_TTL_MS);

	const result = await Entity.RoomsEntity.updateMany(
		{
			building: buildingId,
		},
		{
			$set: {
				'writeLock.locked': true,
				'writeLock.ownerId': ownerId,
				'writeLock.expAt': expiredAt,
				'writeLock.lockAt': now,
				'writeLock.reason': LOCK_REASON.SETTLEMENT,
			},
			$inc: {
				version: 1,
			},
		},
	);

	return result;
};

const importRoomImages = async (roomId, imagesRef) => {
	const result = await Entity.RoomsEntity.updateOne(
		{ _id: roomId },
		{ $set: { 'roomImage.ref': imagesRef, 'roomImage.lastUpload': new Date() }, $inc: { version: 1 } },
	);
	if (!result) throw new NotFoundError('Phòng không tồn tại !');
	return 'success';
};

const writeNote = async (roomId, note, session) => {
	const result = await Entity.RoomsEntity.updateOne({ _id: roomId }, { $set: { note: note.trim() } }, { session });
	if (!result) throw new NotFoundError('Phòng không tồn tại !');
	return 'success';
};

const updateRoomRental = async ({ roomId, newRent }) => {
	const result = await Entity.RoomsEntity.updateOne({ _id: roomId }, { $set: { rent: newRent }, $inc: { version: 1 } });
	if (result.matchedCount === 0) throw new NotFoundError('Phòng không tồn tại !');
};

const updateRoomByGenerateContract = async ({ roomId, roomPice, roomDeposit, interiors }) => {
	const result = await Entity.RoomsEntity.findOneAndUpdate(
		{ _id: roomId },
		{
			$set: {
				roomPrice: roomPice,
				roomDeposit: roomDeposit,
				interior: interiors,
				roomState: roomState['HIRED'],
				isDeposited: false,
			},
			$inc: { version: 1 },
		},
		{ new: true },
	);

	if (!result) throw new ConflictError('Dữ liệu của phòng đã bị thay đổi, vui lòng tải lại trang !');
	return result;
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
	checkRoomDeposited,
	updateRoomState,
	setRoomDeposited,
	generateRoomHistory,
	completeChangeRoomState,
	getRoomHistories,
	getRoomHistoryDetail,
	importRooms,
	lockAllRoomsForSettlement,
	importRoomImages,
	writeNote,
	updateRoomRental,
	removeInterior,
	updateRoomByGenerateContract,
};
