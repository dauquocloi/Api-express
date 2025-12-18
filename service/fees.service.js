const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const pipelines = require('./aggregates');

exports.getRoomFees = async (roomObjectId, session) => {
	const query = Entity.RoomsEntity.aggregate(pipelines.fees.getRoomFees(roomObjectId));
	if (session) query.session(session);
	const [roomFees] = await query;
	if (!roomFees) throw new NotFoundError('Phòng không tồn tại trong hệ thống');
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
			},
			upsert: false,
		},
	}));
	return await Entity.FeesEntity.bulkWrite(operations, { session });
};
