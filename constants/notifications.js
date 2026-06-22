const notificationTypes = {
	TRANSACTION: 'transaction',
	TASK_COMPLETED: 'taskCompleted',
	ASIGNED_TASK: 'assignedTask',
	CONTRACT_EXPIRE: 'contractExpire',
	COLLECT_CASH: 'collectCash',
	TRANSACTION_DECLINED: 'transactionDeclined',
	ROOM_DEPOSITED: 'roomDeposited',
	ROOM_CHECKOUT_EARLY: 'roomCheckoutEarly',
	REQUEST_TRANSACTION_CONFIRMATION: 'requestTransactionConfirmation',
	ROOM_CHECKOUT: 'roomCheckout',
	CONTRACT_RENEWAL: 'contractRenewal',
	DEPOSIT_TERMINATED: 'depositTerminated',
};

// const notiSettingTypes = {
// 	STAFF_TASK_COMPLETED: 'staffTaskCompleted',
// 	ROOM_CHECKOUT: 'roomCheckout',
// 	ROOM_CHECKOUT_EARLY: 'roomCheckoutEarly',
// 	PAYMENT_RECEIVED: 'paymentReceived',
// 	CASH_COLLECTED: 'cashCollected',
// 	CONTRACT_EXPIRING: 'contractExpiring',
// 	ROOM_DEPOSITED: 'roomDeposited',
// 	ASIGNED_TASK: 'assignedTask',
// };

const ownerNotiSettings = [
	notificationTypes['TASK_COMPLETED'],
	notificationTypes['ROOM_CHECKOUT'],
	notificationTypes['TRANSACTION'],
	notificationTypes['COLLECT_CASH'],
	notificationTypes['CONTRACT_EXPIRE'],
	notificationTypes['CONTRACT_RENEWAL'],
];

const managerNotiSettings = [
	notificationTypes['ASIGNED_TASK'],
	notificationTypes['TRANSACTION'],
	notificationTypes['CONTRACT_EXPIRE'],
	notificationTypes['ROOM_DEPOSITED'],
	notificationTypes['TASK_COMPLETED'],
];

module.exports = { notificationTypes, ownerNotiSettings, managerNotiSettings };
