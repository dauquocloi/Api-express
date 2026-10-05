const feeUnit = {
	PERSON: 'person',
	INDEX: 'index',
	VEHICLE: 'vehicle',
	ROOM: 'room',
};

const unitPriority = {
	room: 1,
	vehicle: 2,
	person: 3,
	index: 4,
	other: 5,
};

const FEE_UNIT_TYPE = {
	index: '/Số',
	person: '/Người',
	vehicle: '/Xe',
	room: '/Phòng',
};

const UPDATE_FEE_INDEX_SOURCE = {
	UPDATE_FEE: 'updateFee',
	CREATE_FEE: 'createFee',
	MODIFY_INVOICE: 'modifyInvoice',
	CREATE_INVOICE: 'createInvoice',
	TERMINATE_INVOICE: 'terminateInvoice',
	CHECKOUT_COST: 'checkoutCost',
	MODIFY_CHECKOUT_COST: 'modifyCheckoutCost',
	DEPOSIT_REFUND: 'depositRefund',
	MODIFY_DEPOSIT_REFUND: 'modifyDepositRefund',
};

module.exports = { feeUnit, unitPriority, FEE_UNIT_TYPE, UPDATE_FEE_INDEX_SOURCE };
