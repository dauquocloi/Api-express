const mongoose = require('mongoose');
const Entity = require('../models');
const listFeeInitial = require('../utils/getListFeeInital');
const { feeUnit } = require('../constants/fees');
const Services = require('../service');
const { NotFoundError, InternalError, InvalidInputError, ConflictError } = require('../AppError');

exports.addFee = async (roomId, feeKey, feeAmount, lastIndex) => {
	let roomObjectId = new mongoose.Types.ObjectId(roomId);

	let findFee = listFeeInitial.find((fee) => fee.feeKey === feeKey);
	if (!findFee) {
		throw new InvalidInputError('Phí không hợp lệ!');
	}

	const currentFee = await Entity.FeesEntity.findOne({ room: roomObjectId, feeKey: findFee.feeKey });
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

	if (findFee.unit === 'index') {
		newFeeInfo.lastIndex = Number(lastIndex);
	}
	console.log('log of new Fee', newFeeInfo);
	const feeCreated = await Entity.FeesEntity.create(newFeeInfo);
	return feeCreated;
};

// exports.getFeesByRoomId = async (data, cb, next) => {
// 	try {
// 		let roomId = new mongoose.Types.ObjectId(`${data}`);
// 		const fees = await Entity.FeesEntity.find({ room: roomId });

// 		if (!fees) {
// 			throw new Error(`Không có dữ liệu ${data}`);
// 		}
// 		cb(null, fees);
// 	} catch (error) {
// 		next(error);
// 	}
// };

exports.deleteFee = async (feeId, userId, roomId) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			await Services.rooms.assertRoomWritable({ roomId, userId, session });
			await Services.fees.removeFee(feeId, session);
			await Services.rooms.bumpRoomVersionBlind(roomId, session);
			return;
		});
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.editFee = async (feeId, roomId, userId, feeAmount, lastIndex, version) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const feeRecent = await Entity.FeesEntity.findOne({ _id: feeId }).lean().exec();
			if (!feeRecent) new NotFoundError('Phí không tồn tại');

			await Services.rooms.assertRoomWritable({ roomId, userId });

			if (feeRecent.unit === feeUnit['INDEX']) {
				// feeRecent.lastIndex = data.lastIndex;
				await Services.fees.modifyFeeUnitIndex(feeId, lastIndex, feeAmount, version);
			} else {
				await Services.fees.modifyFeeAmount(feeId, feeAmount, version);
			}

			await Services.rooms.bumpRoomVersionBlind(roomId, null);
			return;
		});
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};
