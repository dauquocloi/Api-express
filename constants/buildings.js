const buildingPermissions = {
	MANAGER_COLLECT_CASH: 'managerCollectCash',
	MANAGER_EDIT_ROOM_FEE: 'managerEditRoomFee',
	MANAGER_EDIT_INVOICE: 'managerEditInvoice',
	MANAGER_DELETE_INVOICE: 'managerDeleteInvoice',
	MANAGER_ADD_EXPENDITURE: 'managerAddExpenditure',
	MANAGER_ADD_INCIDENTAL_INCOME: 'managerAddIncidentalIncome',
	MANAGER_EDIT_CONTRACT: 'managerEditContract',
};

const paymentConfirmationMode = {
	AUTO: 'auto',
	MANUAL: 'manual',
};

module.exports = { buildingPermissions, paymentConfirmationMode };
