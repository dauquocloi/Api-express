const checkoutCostStatus = {
	PAID: 'paid',
	PARTIAL: 'partial',
	PENDING: 'pending',
	TERMINATED: 'terminated',
};

const receiptToCheckoutCostStatusMap = {
	unpaid: 'pending',
	paid: 'paid',
	partial: 'partial',
	terminated: 'terminated',
};

module.exports = { checkoutCostStatus, receiptToCheckoutCostStatusMap };
