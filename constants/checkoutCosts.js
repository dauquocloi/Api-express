const { receiptStatus } = require('./receipt');

const checkoutCostStatus = {
	PAID: 'paid',
	PARTIAL: 'partial',
	PENDING: 'pending',
	TERMINATED: 'terminated',
};

const receiptToCheckoutCostStatusMap = {
	[receiptStatus['PENDING']]: 'pending',
	[receiptStatus['UNPAID']]: 'pending',
	[receiptStatus['PAID']]: 'paid',
	[receiptStatus['PARTIAL']]: 'partial',
	[receiptStatus['TERMINATED']]: 'terminated',
};

module.exports = { checkoutCostStatus, receiptToCheckoutCostStatusMap };
