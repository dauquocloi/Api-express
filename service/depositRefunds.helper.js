const calculateDepositRefundAmount = (
	depositPaidAmount,
	debtsAmount,
	receiptsUnpaidAmount,
	invoiceUnpaidAmount,
	feesOtherAmount,
	totalRoomFeeAmount,
) => {
	return depositPaidAmount - (debtsAmount + receiptsUnpaidAmount + invoiceUnpaidAmount + feesOtherAmount + totalRoomFeeAmount);
};

module.exports = { calculateDepositRefundAmount };
