const calculateDepositRefundAmount = (
	depositPaidAmount,
	debtsAmount,
	receiptsUnpaidAmount,
	invoiceUnpaidAmount,
	feesOtherAmount,
	feeIndexValuesAmount,
) => {
	return depositPaidAmount - (debtsAmount + receiptsUnpaidAmount + invoiceUnpaidAmount + feesOtherAmount + feeIndexValuesAmount);
};

module.exports = { calculateDepositRefundAmount };
