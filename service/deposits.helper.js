const Services = require('./index');
const { depositStatus, receiptToDepositStatus } = require('../constants');
const { NotFoundError } = require('../AppError');
const { NOTI_ROOM_DEPOSITED } = require('../jobs/constant/jobNames');
const { notificationJob } = require('../jobs/notification/notification.job');

exports.calculateDepositStatus = (depositAmount, depositPaidAmount) => {
	if (depositPaidAmount >= depositAmount) {
		return depositStatus.PAID;
	}

	if (depositPaidAmount === 0) {
		return depositStatus.PENDING;
	}

	return depositStatus.PARTIAL;
};

exports.updateDepositFromPayment = async ({ depositReceiptId, newReceiptStatus, newPaidAmount }) => {
	const currentDeposit = await Services.deposits.findByReceiptId(depositReceiptId).lean().exec();
	if (!currentDeposit) throw new NotFoundError('Dữ liệu đặt cọc không tồn tại !');
	if (currentDeposit.status === depositStatus['CLOSED']) return;

	const newDepositStatus = receiptToDepositStatus[newReceiptStatus];
	await Services.deposits.updateDepositByPayment({
		depositId: currentDeposit._id,
		receiptId: depositReceiptId,
		actualDepositAmount: newPaidAmount,
		status: newDepositStatus,
	});

	if (currentDeposit.status === depositStatus['WAITING_PAYMENT']) {
		await Services.rooms.setRoomDeposited({ roomId: currentDeposit.room, isDeposited: true });

		await notificationJob({ depositId: currentDeposit._id, notiType: NOTI_ROOM_DEPOSITED });
	}
};
