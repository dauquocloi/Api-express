const TRANS_STATUS = {
	PROCESSING: 'processing',
	SUCCESS: 'success',
	FAILED: 'failed',
	ERROR: 'error',
};

const CREATED_BY = {
	SEPAY: 'sepay',
	MANAGER: 'manager',
	OWNER: 'owner',
};

const OWNER_CONFIRMED_STATUS = {
	PENDING: 'pending',
	CONFIRMED: 'confirmed',
	DECLINED: 'declined',
};

const PAYMENT_METHOD = {
	CASH: 'cash',
	TRANSFER: 'transfer',
};

module.exports = { TRANS_STATUS, CREATED_BY, OWNER_CONFIRMED_STATUS, PAYMENT_METHOD };
