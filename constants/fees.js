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
	LIST_FEES: 'listFees',
	MODIFY_INVOICE: 'modifyInvoice',
	CREATE_INVOICE: 'createInvoice',
	UPDATE_INVOICE: 'updateInvoice',
	CHECKOUT_COST: 'checkoutCost',
	depositRefund: 'depositRefund',
};

module.exports = { feeUnit, unitPriority, FEE_UNIT_TYPE, UPDATE_FEE_INDEX_SOURCE };
