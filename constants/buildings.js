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

const LOCK_BUILDING_TTL_MS = 10 * 60 * 1000;

module.exports = { buildingPermissions, paymentConfirmationMode, LOCK_BUILDING_TTL_MS };
