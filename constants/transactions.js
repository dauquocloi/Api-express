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

module.exports = { TRANS_STATUS, CREATED_BY, OWNER_CONFIRMED_STATUS };
