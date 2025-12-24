const { NotFoundError, ConflictError, BadRequestError } = require('../AppError');
const Entity = require('../models');
const pipelines = require('./aggregates');

exports.getRoomFeesAndDebts = async (roomObjectId, session) => {
	const checkRoomState = await Entity.RoomsEntity.findById(roomObjectId).session(session).lean().exec();
	if (!checkRoomState) throw new NotFoundError('Phòng không tồn tại');
	if (checkRoomState.roomState !== 1) throw new BadRequestError('Trạng thái phòng đang trống');

	const [roomFees] = await Entity.RoomsEntity.aggregate(pipelines.fees.getRoomFeesAndDebts(roomObjectId)).session(session);
	if (!roomFees) throw new NotFoundError('Dữ liệu không tồn tại');

	return roomFees;
};

exports.updateFeeIndexValues = async (feeIndexIds, feeIndexValues, session) => {
	const operations = feeIndexIds.map((feeId) => ({
		updateOne: {
			filter: {
				_id: feeId,
			},
			update: {
				$set: {
					lastIndex: Number(feeIndexValues[feeId].secondIndex),
					// firstIndex: Number(feeIndexValues[feeId].firstIndex),
				},
				$inc: { version: 1 },
			},
			upsert: false,
		},
	}));
	const result = await Entity.FeesEntity.bulkWrite(operations, { session });
	if (result.matchedCount !== operations.length) {
		throw new ConflictError('Some fees were modified by another transaction');
	}
	return 'Success';
};

exports.rollbackFeeIndexValues = async (feeIndexIds, feeIndexValues, session) => {
	const operations = feeIndexIds.map((feeId) => ({
		updateOne: {
			filter: {
				_id: feeId,
			},
			update: {
				$set: {
					lastIndex: Number(feeIndexValues[feeId].firstIndex),
					// firstIndex: Number(feeIndexValues[feeId].firstIndex),
				},
				$inc: { version: 1 },
			},
			upsert: false,
		},
	}));
	const result = await Entity.FeesEntity.bulkWrite(operations, { session });
	if (result.matchedCount !== operations.length) {
		throw new ConflictError('Some fees were modified by another transaction');
	}
	return 'Success';
};

exports.modifyFeeAmount = async (feeId, feeAmount, version) => {
	const result = await Entity.FeesEntity.updateOne(
		{ _id: feeId, version: version },
		{
			$set: {
				feeAmount: feeAmount.feeAmount,
			},
			$inc: {
				version: 1,
			},
		},
	);
	if (result.n === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.modifyFeeUnitIndex = async (feeId, lastIndex, feeAmount, version) => {
	const result = await Entity.FeesEntity.updateOne(
		{ _id: feeId, version: version },
		{
			$set: {
				lastIndex: lastIndex,
				feeAmount: feeAmount,
			},
			$inc: {
				version: 1,
			},
		},
	);
	if (result.n === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.removeFee = async (feeId, session) => {
	const result = await Entity.FeesEntity.deleteOne({ _id: feeId }, { session });
	if (result.deletedCount !== 1) throw new NotFoundError('Phí không tồn tại !');

	return 'success';
};
