const { NotFoundError } = require('../../AppError');
const Services = require('../index');
const { calculateTotalFeeAmount } = require('../../utils/calculateFeeTotal');
const { checkoutCostStatus, receiptStatus, receiptToCheckoutCostStatusMap } = require('../../constants');

exports.calculateTotalCheckoutCostAmount = (roomFees, debts, receiptsUnpaid, invoicesUnpaid, feesOther) => {
	let totalCost = 0;
	totalCost += calculateTotalFeeAmount(roomFees);

	totalCost += invoicesUnpaid?.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.paidAmount, 0), 0) || 0;

	totalCost += debts?.reduce((sum, debt) => sum + Number(debt.amount || 0), 0) || 0;

	totalCost += receiptsUnpaid?.reduce((sum, receipt) => sum + Math.max(receipt.amount - receipt.paidAmount, 0), 0) || 0;

	totalCost += feesOther?.reduce((sum, fee) => sum + Number(fee.amount || 0), 0) || 0;

	return Math.max(totalCost, 0);
};

exports.calculateCheckoutCostStatus = (checkoutCostAmount, checkoutCostPaidAmount) => {
	if (checkoutCostPaidAmount >= checkoutCostAmount) {
		return checkoutCostStatus.PAID;
	}

	if (checkoutCostPaidAmount === 0) {
		return checkoutCostStatus.PENDING;
	}

	return checkoutCostStatus.PARTIAL;
};

exports.modifyCheckoutCostByReceipt = async ({ checkoutCostId, receiptInfo }) => {
	const { oldReceiptAamount, newReceiptAmount, receiptId, newReceiptStatus } = receiptInfo;
	const checkoutCost = await Services.checkoutCosts.findById(checkoutCostId).populate('checkoutCostReceipt').lean().exec();
	if (!checkoutCost) throw new NotFoundError('Dữ liệu trả phòng không tồn tại !');
	if (!checkoutCost.checkoutCostReceipt) throw new NotFoundError('');
	const { receiptsUnpaid } = checkoutCost;

	if (newReceiptStatus === receiptStatus['PAID']) {
		const newReceiptsUnpaid = receiptsUnpaid.filter((receipt) => receipt._id.toString() !== receiptUpdatedInfo.receiptId.toString());
		const newCheckoutCostTotal = checkoutCost.total - oldReceiptAamount + newReceiptAmount;
		const newCheckoutCostStatus = this.calculateCheckoutCostStatus(newCheckoutCostTotal, checkoutCost.checkoutCostReceipt.paidAmount);

		// return await Services.checkoutCosts.
	}
};

exports.updateCheckoutCostFromPayment = async ({ checkoutCostReceiptId, newReceiptStatus }) => {
	const newCheckoutCostStatus = receiptToCheckoutCostStatusMap[newReceiptStatus];
	await Services.checkoutCosts.updateCheckoutCostPaymentStatusByReceiptId(checkoutCostReceiptId, newCheckoutCostStatus);
};
