const pipelines = require('./aggregates');
const Entity = require('../models');
const { NotFoundError } = require('../AppError');
const { debtStatus } = require('../constants/debts');

exports.getDebtsAndReceiptUnpaid = async (roomObjectId, currentMonth, currentYear, session) => {
	const query = Entity.RoomsEntity.aggregate(pipelines.debts.getDebtsAndReceiptUnpaid(roomObjectId, currentMonth, currentYear));
	if (session) query.session(session);
	const [debtsAndReceiptUnpaid] = await query;
	if (!debtsAndReceiptUnpaid) throw new NotFoundError('Phòng không tồn tại trong hệ thống');
	if (!debtsAndReceiptUnpaid.receiptDeposit) throw new NotFoundError(`Hóa đơn đặt cọc không tồn tại !`);

	return debtsAndReceiptUnpaid;
};

exports.getDebts = async (roomId, session) => {
	return await Entity.DebtsEntity.find({ room: roomId, status: debtStatus.PENDING }).session(session);
};

exports.closeDebts = async (roomId, session) => {
	const result = await Entity.DebtsEntity.updateMany(
		{ room: roomId, status: debtStatus.PENDING },
		{ $set: { status: debtStatus.CLOSED } },
		{ session },
	);

	if (result.matchedCount === 0) {
		throw new NotFoundError('Không tìm thấy bản ghi');
	}

	return result;
};

exports.terminateDebts = async (debtIds, session) => {
	const result = await Entity.DebtsEntity.updateMany({ _id: { $in: debtIds } }, { $set: { status: debtStatus['TERMINATED'] } }, { session });
	if (result.matchedCount === 0 || result.matchedCount !== debtIds.length) throw new NotFoundError('Không tìm thấy bản ghi');
	return result;
};

exports.getDebtsByIds = async (debtIds, session) => {
	const query = Entity.DebtsEntity.find({ _id: { $in: debtIds } });
	if (session) query.session(session);
	const result = await query.lean().exec();
	if (!result || result.length === 0) throw new NotFoundError('Dữ liệu không tồn tại');
	return result;
};
