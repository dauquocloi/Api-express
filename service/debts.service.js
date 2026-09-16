const pipelines = require('./aggregates');
const Entity = require('../models');
const { NotFoundError } = require('../AppError');
const { debtStatus } = require('../constants/debts');

exports.findPendingDebts = (roomId) => Entity.DebtsEntity.find({ room: roomId, status: debtStatus.PENDING });

exports.getDebtsAndReceiptUnpaid = async (roomObjectId, currentMonth, currentYear, session) => {
	const [result] = await Entity.RoomsEntity.aggregate(pipelines.debts.getDebtsAndReceiptUnpaid(roomObjectId, currentMonth, currentYear)).session(
		session,
	);
	if (!result) throw new NotFoundError('Phòng không tồn tại trong hệ thống');
	if (!result.receiptDeposit) throw new NotFoundError(`Hóa đơn đặt cọc không tồn tại !`);

	return result;
};

exports.getDebts = (roomId) => Entity.DebtsEntity.find({ room: roomId, status: debtStatus.PENDING });

exports.closeDebts = async (roomId) => {
	const result = await Entity.DebtsEntity.updateMany({ room: roomId, status: debtStatus.PENDING }, { $set: { status: debtStatus.CLOSED } });

	if (result.matchedCount === 0) {
		throw new NotFoundError('Không tìm thấy bản ghi');
	}

	return result;
};

exports.closeAndSetSourceInfo = async ({ contractId, sourceId, sourceType }) => {
	const result = await Entity.DebtsEntity.updateMany(
		{ contract: contractId, status: debtStatus['PENDING'] },
		{ status: debtStatus['CLOSED'], sourceId, sourceType },
	);

	if (result.matchedCount === 0) {
		throw new NotFoundError('Không tìm thấy bản ghi');
	}

	return true;
};

exports.updateDebtsStatus = async (debtIds, status) => {
	const result = await Entity.DebtsEntity.updateMany({ _id: { $in: debtIds } }, { $set: { status } });
	if (result.matchedCount === 0 || result.matchedCount !== debtIds.length) throw new NotFoundError('Không tìm thấy bản ghi');
	return true;
};

exports.rollBackDebtsBySourceIds = async (sourceIds, status) => {
	const result = await Entity.DebtsEntity.updateMany({ sourceId: { $in: sourceIds } }, { $set: { status, sourceId: null } });
	if (result.matchedCount === 0 || result.matchedCount !== debtIds.length) throw new NotFoundError('Không tìm thấy bản ghi');
	return true;
};

exports.getDebtsByIds = async (debtIds) => Entity.DebtsEntity.find({ _id: { $in: debtIds } });

exports.generateDebts = async (debtsPayload, session) => {
	const result = await Entity.DebtsEntity.insertMany(debtsPayload, { session });
	return result;
};
