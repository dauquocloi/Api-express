const { receiptStatus } = require('../constants/receipt');
const calculateTotalReceipts = (receipts) => {
	return receipts.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0);
};

const calculateReceiptStatusAfterModified = (paidAmount, newAmount) => {
	if (paidAmount === 0) return receiptStatus[`UNPAID`];
	if (paidAmount < newAmount) return receiptStatus[`PARTIAL`];
	if (paidAmount >= newAmount) return receiptStatus[`PAID`];
};

module.exports = {
	calculateTotalReceipts,
	calculateReceiptStatusAfterModified,
};
