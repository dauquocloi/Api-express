const { NotFoundError, ConflictError, BadRequestError, InternalError } = require('../AppError');
const Entity = require('../models');
const pipelines = require('./aggregates');
const { feeUnit: FEE_UNIT } = require('../constants/fees');
const listFeeInitial = require('../utils/getListFeeInital');

exports.findById = (feeId) => Entity.FeesEntity.findById(feeId);

exports.findByRoomId = (roomId) => Entity.FeesEntity.find({ room: roomId });

exports.findByRoomIdAndFeeKey = (roomId, feeKeys) => Entity.FeesEntity.find({ room: roomId, feeKey: { $in: feeKeys } });

exports.createFee = async (data) => {
	const result = await Entity.FeesEntity.create(data);
	if (!result) throw new InternalError('Cannot create fee');
	return result;
};

exports.getRoomFeesAndDebts = async (roomObjectId) => {
	const [roomFees] = await Entity.RoomsEntity.aggregate(pipelines.fees.getRoomFeesAndDebts(roomObjectId));
	if (!roomFees) throw new NotFoundError('Dữ liệu không tồn tại');

	return roomFees;
};

exports.getFeeUnitIndexByRoomId = async ({ roomId }) => {
	const result = await Entity.FeesEntity.find({ room: roomId, unit: FEE_UNIT['INDEX'] }).lean().exec();

	return result ?? [];
};

exports.updateFeeIndexValues = async (feeIndexIds, feeIndexValues) => {
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

	const result = await Entity.FeesEntity.bulkWrite(operations);
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
				feeAmount: feeAmount,
			},
			$inc: {
				version: 1,
			},
		},
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
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
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu hóa đơn đã bị thay đổi !');
	return result;
};

exports.removeFee = async (feeId) => {
	const result = await Entity.FeesEntity.deleteOne({ _id: feeId });
	if (result.deletedCount !== 1) throw new NotFoundError('Phí không tồn tại !');

	return 'success';
};

// use for modify checkout, refund deposit, modify invoice.
exports.updateFeeIndexValuesByFeeKey = async (feeKeys, roomId, modifyFees) => {
	const modifyFeeMap = new Map(modifyFees.map((fee) => [fee.feeKey, fee]));
	const operations = [];

	for (const feeKey of feeKeys) {
		const indexValue = modifyFeeMap.get(feeKey);

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

	if (operations.length === 0) return;

	const result = await Entity.FeesEntity.bulkWrite(operations);

	if (result.matchedCount !== operations.length) {
		throw new ConflictError('Some fees were modified or not found during update');
	}
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

exports.updateFeeIndexHistory = async ({ feeId, lastIndex, editorId }, session) => {
	const feeIndexHistory = await Entity.FeeIndexHistoryEntity.findOne({ fee: feeId }).session(session);
	if (!feeIndexHistory) {
		throw new NotFoundError('Fee index history not found');
	}

	const result = await Entity.FeeIndexHistoryEntity.updateOne(
		{ fee: feeId },
		{
			$set: {
				prevIndex: feeIndexHistory.lastIndex,
				lastIndex: lastIndex,
				prevEditor: feeIndexHistory.lastEditor,
				lastEditor: editorId,
				prevUpdated: feeIndexHistory.lastUpdated,
				lastUpdated: new Date(),
			},
		},
		{ session },
	);
	if (result.matchedCount === 0) {
		throw new NotFoundError('Fee index history not found !');
	}
	return result;
};

exports.updateFeeIndexHistoryMany = async ({ payloads = [], editorId }) => {
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

	const result = await Entity.FeeIndexHistoryEntity.bulkWrite(ops);

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

exports.importFees = async (feesData) => {
	const result = await Entity.FeesEntity.insertMany(feesData);
	return result;
};

exports.generateFeeIndexRecords = async (records) => {
	const documents = records.map(({ feeId, fromIndex, toIndex, editorId, roomId, fromSource }) => ({
		fee: feeId,
		fromIndex,
		toIndex,
		editor: editorId,
		room: roomId,
		fromSource,
	}));

	const result = await Entity.FeeIndexRecordsEntity.insertMany(documents);

	if (!result?.length) {
		throw new InternalError('Cannot create fee index records');
	}

	return result;
};

exports.getFeeIndexRecords = async ({ roomId, feeId }) => {
	const result = await Entity.FeeIndexRecordsEntity.find({ room: roomId, fee: feeId })
		.populate({ path: 'fee' })
		.populate({ path: 'editor', select: 'fullName' })
		.lean()
		.exec();
	return result || [];
};

exports.setFeesIndexValue = async (data) => {
	const operations = data.map((item) => ({
		updateOne: {
			filter: {
				room: item.roomId,
				feeKey: item.feeKey,
			},
			update: {
				$set: {
					lastIndex: item.lastIndex,
				},
				$inc: {
					version: 1,
				},
			},
		},
	}));

	if (operations.length === 0) return;

	const result = await Entity.FeesEntity.bulkWrite(operations);

	if (result.matchedCount === 0 || result.matchedCount !== operations.length) {
		throw new ConflictError('Some fees were modified or not found during update');
	}

	return result;
};

exports.generateAndUpdateFees = async ({ feesToCreate, feesToUpdate, feesToRemove, roomId }) => {
	const listFeeInitialMap = new Map(feesToCreate.map((fee) => [fee.feeKey, fee]));
	const operations = [
		...feesToUpdate.map((fee) => ({
			updateOne: {
				filter: {
					_id: fee.feeId,
					room: roomId,
				},
				update: {
					$set: {
						feeAmount: fee.feeAmount,
					},
					$inc: {
						version: 1,
					},
				},
			},
		})),

		...feesToCreate.map((fee) => ({
			insertOne: {
				document: {
					unit: listFeeInitialMap.get(fee.feeKey).unit,
					feeName: listFeeInitialMap.get(fee.feeKey).feeName,
					iconPath: listFeeInitialMap.get(fee.feeKey).iconPath,
					feeKey: fee.feeKey,
					feeAmount: fee.feeAmount,
					lastIndex: fee.lastIndex || null,
					room: roomId,
				},
			},
		})),

		...feesToRemove.map((fee) => ({
			deleteOne: {
				filter: {
					_id: fee._id,
					room: roomId,
				},
			},
		})),
	];

	console.log('[FEES] bulkWrite operations:', JSON.stringify(operations, null, 2));

	const result = await Entity.FeesEntity.bulkWrite(operations);

	const expectedUpdateCount = feesToUpdate.length;
	const expectedCreateCount = feesToCreate.length;
	const expectedRemoveCount = feesToRemove.length;

	const actualUpdateMatchedCount = result.matchedCount;
	const actualUpdateModifiedCount = result.modifiedCount;
	const actualCreateCount = result.insertedCount;
	const actualRemoveCount = result.deletedCount;

	if (
		actualUpdateMatchedCount !== expectedUpdateCount ||
		actualUpdateModifiedCount !== expectedUpdateCount ||
		actualCreateCount !== expectedCreateCount ||
		actualRemoveCount !== expectedRemoveCount
	) {
		throw new ConflictError('Đồng bộ phí phòng không thành công. Dữ liệu đã thay đổi bởi một thao tác khác.');
	}
};
