const { calculateTotalFeeAmount } = require('../../utils/calculateFeeTotal');

const calculateTotalCheckoutCostAmount = (roomFees, debts, receiptsUnpaid, invoiceUnpaid, feesOther) => {
	let totalCost = 0;
	totalCost += calculateTotalFeeAmount(roomFees);

	if (invoiceUnpaid) {
		totalCost += Math.max(invoiceUnpaid.total - invoiceUnpaid.paidAmount, 0);
	}

	totalCost += debts.reduce((sum, debt) => sum + Number(debt.amount || 0), 0);

	totalCost += receiptsUnpaid.reduce((sum, receipt) => sum + Math.max(receipt.amount - receipt.paidAmount, 0), 0);

	totalCost += feesOther.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

	return totalCost;
};

module.exports = {
	calculateTotalCheckoutCostAmount,
};
