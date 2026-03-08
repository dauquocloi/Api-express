const RESOURCE_ID_MAP = {
	buildings: 'buildingId',
	rooms: 'roomId',
	invoices: 'invoiceId',
	receipts: 'receiptId',
	contracts: 'contractId',
	fees: 'feeId',
	customers: 'customerId',
	deposits: 'depositId',
	vehicles: 'vehicleId',
	transactions: 'transactionId',
	tasks: 'taskId',
	notifications: 'notificationId',
	keyStores: 'keyStoreId',
	incidentalRevenues: 'incidentalRevenueId',
	revenues: 'revenueId',
	expenditures: 'expenditureId',
	depositRefunds: 'depositRefundId',
	users: 'userId',
	checkoutCosts: 'checkoutCostId',
};

const RESOURCES = Object.fromEntries(Object.keys(RESOURCE_ID_MAP).map((k) => [k, k]));

const VALIDATE_SOURCE = {
	PARAMS: 'params',
	QUERY: 'query',
	BODY: 'body',
};

module.exports = { RESOURCE_ID_MAP, VALIDATE_SOURCE, RESOURCES };
