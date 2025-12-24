const calculateFeeIndexAmount = (feeAmount, secondIndex, firstIndex) => {
	return (Number(secondIndex) - Number(firstIndex)) * Number(feeAmount);
};

const calculateFeeUnitQuantityAmount = (amount, quantity = 1, stayDays) => {
	return Math.round(((Number(amount) * Number(quantity)) / 30) * Math.max(Number(stayDays), 0));
};

const calculateInvoiceUnpaidAmount = (amount, paidAmount) => {
	return Math.max(amount - paidAmount, 0);
};

const calculateTotalFeeAmount = (listFees) => {
	if (!listFees || !Array.isArray(listFees)) return 0;

	return listFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
};

const calculateTotalFeesOther = (listFeesOther) => {
	return listFeesOther.reduce((sum, fee) => sum + Number(fee.amount), 0);
};

module.exports = {
	calculateInvoiceUnpaidAmount,
	calculateFeeIndexAmount,
	calculateFeeUnitQuantityAmount,
	calculateTotalFeeAmount,
	calculateTotalFeesOther,
};
