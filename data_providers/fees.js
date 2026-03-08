const mongoose = require('mongoose');
const Entity = require('../models');
const listFeeInitial = require('../utils/getListFeeInital');
const { feeUnit } = require('../constants/fees');
const Services = require('../service');
const redis = require('../config/redisClient');
const { NotFoundError, InternalError, InvalidInputError, ConflictError, BadRequestError } = require('../AppError');

exports.addFee = async (roomId, feeKey, feeAmount, lastIndex, redisKey, userId) => {
	let roomObjectId = new mongoose.Types.ObjectId(roomId);
	await Services.rooms.assertRoomWritable({ roomId, userId });

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

	if (findFee.unit === feeUnit['INDEX']) {
		newFeeInfo.lastIndex = Number(lastIndex) || 0;
	}
	console.log('log of new Fee', newFeeInfo);
	const feeCreated = await Entity.FeesEntity.create(newFeeInfo);

	await redis.set(redisKey, `SUCCESS:${JSON.stringify(feeCreated)}`, 'EX', process.env.REDIS_EXP_SEC);
	return feeCreated;
};

exports.deleteFee = async (feeId, userId) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const currentFee = await Services.fees.findById(feeId).session(session).lean().exec();
			if (!currentFee) throw new NotFoundError('Phí không tồn tại');
			if (currentFee.feeKey === 'SPEC100PH') throw new BadRequestError('Không thể xóa tiền phòng');
			await Services.rooms.assertRoomWritable({ roomId: currentFee.room, userId, session });
			await Services.fees.removeFee(feeId, session);
			await Services.rooms.bumpRoomVersionBlind(currentFee.room, session);
			return;
		});
		return 'Success';
	} catch (error) {
		throw error;
	} finally {
		if (session) session.endSession();
	}
};

exports.editFee = async (feeId, roomId, userId, feeAmount, lastIndex, version, redisKey) => {
	let session;
	try {
		session = await mongoose.startSession();
		await session.withTransaction(async () => {
			const feeRecent = await Entity.FeesEntity.findOne({ _id: feeId }).session(session).lean().exec();
			if (!feeRecent) new NotFoundError('Phí không tồn tại');

			await Services.rooms.assertRoomWritable({ roomId, userId, session });

			if (feeRecent.unit === feeUnit['INDEX']) {
				// feeRecent.lastIndex = data.lastIndex;
				await Services.fees.modifyFeeUnitIndex(feeId, lastIndex, feeAmount, version, session);
			} else {
				await Services.fees.modifyFeeAmount(feeId, feeAmount, version, session);
			}

			await Services.rooms.bumpRoomVersionBlind(roomId, session);
			return;
		});

		await redis.set(redisKey, `SUCCESS:${JSON.stringify({})}`, 'EX', process.env.REDIS_EXP_SEC);
		return 'Success';
	} catch (error) {
		await redis.set(redisKey, `FAILED:${error.message}`, 'EX', process.env.REDIS_EXP_SEC);
		throw error;
	} finally {
		if (session) session.endSession();
	}
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
