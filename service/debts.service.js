const pipelines = require('./aggregates');
const Entity = require('../models');
const { NotFoundError } = require('../AppError');
const { debtStatus } = require('../constants/debts');

exports.getDebtsAndReceiptUnpaid = async (roomObjectId, currentMonth, currentYear, session) => {
	const [debtsAndReceiptUnpaid] = await Entity.RoomsEntity.aggregate(
		pipelines.debts.getDebtsAndReceiptUnpaid(roomObjectId, currentMonth, currentYear),
	).session(session);
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
