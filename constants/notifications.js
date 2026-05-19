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

const notiSettingTypes = {
	STAFF_TASK_COMPLETED: 'staffTaskCompleted',
	ROOM_CHECKOUT: 'roomCheckout',
	ROOM_CHECKOUT_EARLY: 'roomCheckoutEarly',
	PAYMENT_RECEIVED: 'paymentReceived',
	CASH_COLLECTED: 'cashCollected',
	CONTRACT_EXPIRING: 'contractExpiring',
	ROOM_DEPOSITED: 'roomDeposited',
	ASIGNED_TASK: 'assignedTask',
};

const ownerNotificationTypes = [
	notificationTypes['STAFF_TASK_COMPLETED'],
	notificationTypes['ROOM_CHECKOUT'],
	notificationTypes['ROOM_CHECKOUT_EARLY'],
	notificationTypes['PAYMENT_RECEIVED'],
	notificationTypes['CASH_COLLECTED'],
	notificationTypes['CONTRACT_EXPIRING'],
	notificationTypes['ROOM_DEPOSITED'],
];

const managerNotiticationTypes = [
	notificationTypes['ROOM_CHECKOUT'],
	notificationTypes['ROOM_CHECKOUT_EARLY'],
	notificationTypes['PAYMENT_RECEIVED'],
	notificationTypes['CASH_COLLECTED'],
	notificationTypes['CONTRACT_EXPIRING'],
	notificationTypes['ROOM_DEPOSITED'],
];

module.exports = { notificationTypes };
