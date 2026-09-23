const mongoose = require('mongoose');
const listFeeInitial = require('../utils/getListFeeInital');
const { feeUnit } = require('../constants/fees');
const Services = require('../service');
const { NotFoundError, InternalError, InvalidInputError, ConflictError, BadRequestError } = require('../AppError');
const { UPDATE_FEE_INDEX_SOURCE } = require('../constants');

exports.addFee = async (data) => {
	const { roomId, feeKey, feeAmount, lastIndex, userId } = data;
	let roomObjectId = new mongoose.Types.ObjectId(roomId);
	await Services.rooms.assertRoomWritable({ roomId, userId });

	const findFee = listFeeInitial.find((fee) => fee.feeKey === feeKey);
	if (!findFee) {
		throw new InvalidInputError('Phí không hợp lệ!');
	}

	const currentFee = await Services.fees.findByRoomIdAndFeeKey(roomId, feeKey).lean().exec();
	if (currentFee) {
		throw new InvalidInputError(`Phí ${findFee.feeName} đã tồn tại`);
	}
	const newFeeInfo = {
		feeKey: findFee.feeKey,
		unit: findFee.unit,
		feeName: findFee.feeName,
		iconPath: findFee.iconPath,
		feeAmount: Number(feeAmount),
		room: roomObjectId,
	};

	if (findFee.unit === feeUnit['INDEX']) {
		newFeeInfo.lastIndex = Number(lastIndex) || 0;
	}
	console.log('log of new Fee', newFeeInfo);
	const feeCreated = await Services.fees.createFee(newFeeInfo);

	return feeCreated;
};

exports.deleteFee = async (feeId, userId) => {
	const currentFee = await Services.fees.findById(feeId).lean().exec();
	if (!currentFee) throw new NotFoundError('Phí không tồn tại');
	if (currentFee.feeKey === 'SPEC100PH') throw new BadRequestError('Không thể xóa tiền phòng');
	await Services.rooms.assertRoomWritable({ roomId: currentFee.room, userId });
	await Services.fees.removeFee(feeId);
	await Services.rooms.bumpRoomVersionBlind(currentFee.room);
	return;
};

exports.editFee = async (data) => {
	const { feeId, roomId, userId, feeAmount, lastIndex, version } = data;

	const feeRecent = await Services.fees.findById(feeId).lean().exec();
	if (!feeRecent) new NotFoundError('Phí không tồn tại');

	await Services.rooms.assertRoomWritable({ roomId, userId });

	if (feeRecent.unit === feeUnit['INDEX']) {
		await Services.fees.modifyFeeUnitIndex(feeId, lastIndex, feeAmount, version);
		if (feeRecent.lastIndex !== lastIndex) {
			await Services.fees.generateFeeIndexRecords([
				{
					feeId,
					fromIndex: feeRecent.lastIndex,
					toIndex: lastIndex,
					editorId: userId,
					roomId,
					fromSource: UPDATE_FEE_INDEX_SOURCE['UPDATE_FEE'],
				},
			]);
		}
	} else {
		await Services.fees.modifyFeeAmount(feeId, feeAmount, version);
	}
	await Services.rooms.bumpRoomVersionBlind(roomId);
	return;
};

exports.getFeeIndexHistory = async (feeId) => {
	const feeIndexHistory = await Services.fees
		.getFeeIndexHistoryByFeeId(feeId)
		.select('lastIndex lastUpdated lastEditor room feeKey fee')
		.populate({ path: 'lastEditor', select: 'fullName _id' })
		.lean()
		.exec();
	if (!feeIndexHistory) {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}

	return feeIndexHistory;
};

exports.getFeeIndexRecords = async ({ roomId, feeId }) => {
	const result = await Services.fees.getFeeIndexRecords({ roomId, feeId });
	return result || [];
};
