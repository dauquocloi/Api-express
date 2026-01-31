const { NotFoundError, ConflictError, BadRequestError } = require('../AppError');
const Entity = require('../models');
const pipelines = require('./aggregates');

exports.findById = (feeId) => Entity.FeesEntity.findById(feeId);

exports.getRoomFeesAndDebts = async (roomObjectId, session) => {
	const checkRoomState = await Entity.RoomsEntity.findById(roomObjectId).session(session).lean().exec();
	if (!checkRoomState) throw new NotFoundError('Phòng không tồn tại');
	if (checkRoomState.roomState === 0) throw new BadRequestError('Trạng thái phòng đang trống');

	const [roomFees] = await Entity.RoomsEntity.aggregate(pipelines.fees.getRoomFeesAndDebts(roomObjectId)).session(session);
	if (!roomFees) throw new NotFoundError('Dữ liệu không tồn tại');

	return roomFees;
};

exports.updateFeeIndexValues = async (feeIndexIds, feeIndexValues, session) => {
	const operations = feeIndexIds.map((feeId) => {
		const key = feeId.toString();
		const indexValue = feeIndexValues[key];

		if (!indexValue) {
			throw new ConflictError(`Missing index value for fee ${key}`);
		}

		return {
			updateOne: {
				filter: { _id: feeId },
				update: {
					$set: { lastIndex: Number(indexValue.secondIndex) },
					$inc: { version: 1 },
				},
			},
		};
	});

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
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.modifyFeeUnitIndex = async (feeId, lastIndex, feeAmount, version, session) => {
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
		{ session },
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.removeFee = async (feeId, session) => {
	const result = await Entity.FeesEntity.deleteOne({ _id: feeId }, { session });
	if (result.deletedCount !== 1) throw new NotFoundError('Phí không tồn tại !');

	return 'success';
};

// use for modify checkout, refund deposit, modify invoice.
exports.updateFeeIndexValuesByFeeKey = async (feeKeys, roomId, modifyFees, session) => {
	const operations = [];

	for (const feeKey of feeKeys) {
		const indexValue = modifyFees.find((item) => item.feeKey === feeKey);

		if (!indexValue) {
			throw new ConflictError(`Missing index value for fee ${feeKey}`);
		}

		operations.push({
			updateOne: {
				filter: {
					room: roomId,
					feeKey: feeKey,
				},
				update: {
					$set: {
						lastIndex: Number(indexValue.lastIndex),
					},
					$inc: {
						version: 1,
					},
				},
			},
		});
	}

	const result = await Entity.FeesEntity.bulkWrite(operations, { session });
	console.log('result: ', result);

	if (result.matchedCount !== operations.length) {
		throw new ConflictError('Some fees were modified or not found during update');
	}

	return 'Success';
};

exports.rollbackFeeIndexValuesByFeeKey = async (fees, roomId, session) => {
	const operations = [];

	for (const fee of fees) {
		operations.push({
			updateOne: {
				filter: {
					room: roomId,
					feeKey: fee.feeKey,
				},
				update: {
					$set: {
						lastIndex: Number(fee.firstIndex),
					},
					$inc: {
						version: 1,
					},
				},
			},
		});
	}

	const result = await Entity.FeesEntity.bulkWrite(operations, { session });
	console.log('result: ', result);

	if (result.matchedCount !== operations.length) {
		throw new ConflictError('Some fees were modified or not found during update');
	}

	return 'Success';
};

// ================== FEE INDEX HISTORY ================== //
exports.createFeeIndexHistory = async (listFeeIndexInitials, session) => {
	const result = await Entity.FeeIndexHistoryEntity.insertMany(listFeeIndexInitials, { session });
	return result;
};

exports.updateFeeIndexHistoryMany = async ({ payloads = [], editorId }, session) => {
	if (!payloads.length) return [];

	const ops = payloads.map(({ feeId, lastIndex, prevIndex }) => ({
		updateOne: {
			filter: { fee: feeId },
			update: [
				{
					$set: {
						prevIndex: {
							$cond: [{ $ne: ['$prevIndex', prevIndex] }, prevIndex, '$lastIndex'],
						},
						lastIndex: {
							$cond: [{ $ne: ['$prevIndex', prevIndex] }, '$lastIndex', lastIndex],
						},

						prevEditor: {
							$cond: [{ $ne: ['$prevIndex', prevIndex] }, editorId, '$lastEditor'],
						},
						lastEditor: {
							$cond: [{ $ne: ['$prevIndex', prevIndex] }, '$lastEditor', editorId],
						},

						prevUpdated: {
							$cond: [{ $ne: ['$prevIndex', prevIndex] }, '$prevUpdated', '$lastUpdated'],
						},
						lastUpdated: {
							$cond: [{ $ne: ['$prevIndex', prevIndex] }, '$lastUpdated', new Date()],
						},
					},
				},
			],
		},
	}));

	const result = await Entity.FeeIndexHistoryEntity.bulkWrite(ops, { session });

	if (result.matchedCount !== payloads.length) {
		throw new NotFoundError('Some fee index histories not found');
	}

	return result;
};

exports.rollBackFeeIndexHistoryMany = async (feeKeys, roomId, session) => {
	const result = await Entity.FeeIndexHistoryEntity.updateMany(
		{
			feeKey: { $in: feeKeys },
			room: roomId,
		},
		[
			{
				$set: {
					lastIndex: '$prevIndex',
					lastEditor: '$prevEditor',
					lastUpdated: '$prevUpdated',
				},
			},
		],
		{ session, updatePipeline: true },
	);

	if (result.matchedCount === 0) {
		throw new NotFoundError('Fee index history not found');
	}

	return result;
};

exports.getFeeIndexHistoryByFeeId = (feeId) => {
	return Entity.FeeIndexHistoryEntity.findOne({ fee: feeId });
};

exports.importFees = async (feesData, session) => {
	const result = await Entity.FeesEntity.insertMany(feesData, { session });
	return result;
};
