const { calculateTotalFeeAmount } = require('../../utils/calculateFeeTotal');

const calculateTotalCheckoutCostAmount = (roomFees, debts, receiptsUnpaid, invoicesUnpaid, feesOther) => {
	let totalCost = 0;
	totalCost += calculateTotalFeeAmount(roomFees);

	totalCost += invoicesUnpaid?.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.paidAmount, 0), 0) || 0;

	totalCost += debts?.reduce((sum, debt) => sum + Number(debt.amount || 0), 0) || 0;

	totalCost += receiptsUnpaid?.reduce((sum, receipt) => sum + Math.max(receipt.amount - receipt.paidAmount, 0), 0) || 0;

	totalCost += feesOther?.reduce((sum, fee) => sum + Number(fee.amount || 0), 0) || 0;

	return Math.max(totalCost, 0);
};

module.exports = {
	calculateTotalCheckoutCostAmount,
};
