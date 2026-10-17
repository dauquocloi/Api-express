const Services = require('./index');
const { depositStatus, receiptToDepositStatus } = require('../constants');
const { NotFoundError } = require('../AppError');

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
	const currentDeposit = await Services.deposits.findById(depositReceiptId).lean().exec();
	if (!currentDeposit) throw new NotFoundError('Dữ liệu đặt cọc không tồn tại !');
	if (currentDeposit.status === depositStatus['CLOSED']) return;

	const newDepositStatus = receiptToDepositStatus[newReceiptStatus];
	await Services.deposits.updateDepositByPayment({
		receiptId: depositReceiptId,
		actualDepositAmount: newPaidAmount,
		status: newDepositStatus,
	});
};
