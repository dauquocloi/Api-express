const Entity = require('../models');
const { depositStatus } = require('../constants/deposits');
const Pipelines = require('./aggregates');
const { ConflictError } = require('../AppError');

exports.findById = (depositId) => Entity.DepositsEntity.findById(depositId);

exports.findDepositByRoomId = async (roomId, session) => {
	const query = Entity.DepositsEntity.findOne({
		room: roomId,
		status: { $nin: [depositStatus['CLOSED'], depositStatus['CANCELLED'], depositStatus['PENDING']] },
	});
	if (session) query.session(session);
	const result = await query.lean().exec();
	return result;
};

exports.getDeposits = async (buildingObjectId) => {
	const [result] = await Entity.DepositsEntity.aggregate(Pipelines.deposits.getDepositsPipeline(buildingObjectId));
	if (!result) return [];
	return result?.listDeposits ?? [];
};

exports.cancelledDeposit = async (depositId, version, session) => {
	const result = await Entity.DepositsEntity.updateOne(
		{ _id: depositId, version: version },
		{ $set: { status: depositStatus['CANCELLED'] }, $inc: { version: 1 } },
		{ session },
	);
	if (result.matchedCount === 0) throw new ConflictError('Dữ liệu đặt cọc đã bị thay đổi!');
	return result;
};
