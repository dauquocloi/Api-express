const { receiptStatus } = require('../constants');
const calculateTotalReceipts = (receipts) => {
	return receipts.reduce((sum, item) => sum + Math.max(item.amount - item.paidAmount, 0), 0);
};

module.exports = {
	calculateTotalReceipts,
};
