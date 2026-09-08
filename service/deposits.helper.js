const { depositStatus } = require('../constants');

exports.calculateDepositStatus = (depositAmount, depositPaidAmount) => {
	if (depositPaidAmount >= depositAmount) {
		return depositStatus.PAID;
	}

	if (depositPaidAmount === 0) {
		return depositStatus.PENDING;
	}

	return depositStatus.PARTIAL;
};

// exports.calculateDepositAmount;
