const mongoose = require('mongoose');
var Entity = require('../models');
const uploadFile = require('../utils/uploadFile');
const { NotFoundError, NoDataError, InvalidInputError, ConflictError, InternalError } = require('../AppError');
const Services = require('../service');
const getFileUrl = require('../utils/getFileUrl');
const deepMutate = require('../utils/deepMutate');
const { client: redis } = require('../config').redisDb;
const { roomState, contractStatus } = require('../constants');

exports.getRoom = async (roomId) => {
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	console.time('fetch room');
	const roomInfo = await Services.rooms.getRoom(roomObjectId);
	console.timeEnd('fetch room');
	return roomInfo;
};

exports.addInterior = async (roomId, interior) => {
	const newInteriorInfo = {
		_id: new mongoose.Types.ObjectId(),
		interiorName: interior.interiorName,
		quantity: interior.interiorQuantity,
		interiorRentalDate: interior.interiorRentalDate,
	};
	await Services.rooms.addInterior(roomId, newInteriorInfo);
};

exports.editInterior = async (interiorId, roomId, interior) => {
	await Services.rooms.modifyInterior(roomId, interiorId, interior);
};

exports.removeInterior = async (interiorId, roomId) => {
	await Services.rooms.removeInterior({ interiorId, roomId });
};

exports.modifyRent = async (roomId, rentModify, userId, shouldRequestCustomerVerification) => {
	await Services.rooms.assertRoomWritable({ roomId, userId });

	const room = await Services.rooms.findById(roomId).lean().exec();
	if (!room) throw new NotFoundError('Phòng không tồn tại');

	await Services.rooms.updateRoomRental({ roomId, newRent: rentModify });
	if (room.roomState === roomState['UN_HIRED']) return;

	const contract = await Services.contracts.findByRoomId(roomId).lean().exec();
	if (!contract) throw new NotFoundError('Hợp đồng không tồn tại');
	const currentVersion = contract.versions.find((v) => v.status === contractStatus.ACTIVE) || null;
	console.log('currentVersion', currentVersion);
	if (!currentVersion) throw new NotFoundError('Hợp đồng chưa được khách hàng xác nhận !');

	const roomFees = await Services.fees.findByRoomId(contract.room).lean().exec();
	const formatFees = roomFees.map((fee) => ({
		feeName: fee.feeName,
		feeAmount: fee.feeAmount,
		unit: fee.unit,
		feeKey: fee.feeKey,
		iconPath: fee.iconPath,
	}));

	const result = await Services.contracts.modifyContractVersion({
		contractId: contract._id,
		rent: rentModify,
		depositAmount: currentVersion.depositAmount,
		contractSignDate: currentVersion.contractSignDate,
		contractEndDate: currentVersion.contractEndDate,
		contractTerm: currentVersion.contractTerm,
		fees: formatFees,
		contractStatus: contractStatus.ACTIVE,
		currentVersionNumber: currentVersion.version,
	});

	// throw new InternalError('Error');

	return result;
};

exports.getRoomFeesAndDebts = async (roomId, userId) => {
	const roomObjectId = new mongoose.Types.ObjectId(roomId);

	const feesDebts = await Services.fees.getRoomFeesAndDebts(roomObjectId);

	await Services.rooms.setWriteLockedRoom(roomId, null, userId);

	return feesDebts;
};

exports.getRoomHistories = async (roomId) => {
	const roomObjectId = new mongoose.Types.ObjectId(roomId);
	const result = await Services.rooms.getRoomHistories(roomObjectId);
	return result;
};

exports.getRoomHistoryDetail = async (roomHistoryId) => {
	const roomHistoryObjectId = new mongoose.Types.ObjectId(roomHistoryId);
	const result = await Services.rooms.getRoomHistoryDetail(roomHistoryObjectId);
	await deepMutate(result, (key, value, parent) => key === 'contractPdfUrl', getFileUrl);
	return result;
};

exports.importImage = async (roomId, images) => {
	const currentRoom = await Services.rooms.findById(roomId).lean().exec();
	if (!currentRoom) throw new NotFoundError('Phòng không tồn tại !');

	const roomImageKeys = [];
	for (const image of images) {
		const handleuploadFile = await uploadFile(image);
		roomImageKeys.push(handleuploadFile.Key);
	}
	await Services.rooms.importRoomImages(roomId, roomImageKeys);
	return 'success';
};

exports.updateNoteRoom = async (roomId, note) => {
	await Services.rooms.writeNote(roomId, note);
	return true;
};

exports.deleteDebts = async (roomId) => {
	await Services.rooms.assertRoomWritable({ roomId });
	const findDebts = await Services.debts.findPendingDebts(roomId).lean().exec();
	if (!findDebts || findDebts.length === 0) throw new NotFoundError('Nợ không tồn tại');

	await Services.debts.terminateDebts(findDebts.map((item) => item._id));

	return 'Success';
};

exports.getRoomImages = async (roomId) => {
	const room = await Services.rooms.findById(roomId).lean().exec();
	if (!room) throw new NotFoundError('Dữ liệu không tồn tại !');
	if (!room.roomImage || room.roomImage?.ref?.length === 0) return { roomImageUrl: [], lastUpload: null };

	const roomImageUrl = [];
	for (const key of room.roomImage.ref) {
		const signalUrl = await getFileUrl(key);
		roomImageUrl.push(signalUrl);
	}

	return {
		roomImageUrl,
		lastUpload: room.roomImage.lastUpload,
	};
};

//================================ UN REFACTED =====================================//
