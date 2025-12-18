const calculateFeeIndexAmount = (feeAmount, secondIndex, firstIndex) => {
	return (Number(secondIndex) - Number(firstIndex)) * Number(feeAmount);
};

const calculateFeeUnitQuantityAmount = (amount, quantity = 1, stayDays) => {
	return ((Number(amount) * Number(quantity)) / 30) * Math.max(Number(stayDays), 0);
};

// should removed
const calculateTotalFees = (listFees, stayDays) => {
	if (!listFees || !Array.isArray(listFees)) return 0;

	const totalFees = listFees.reduce((sum, fee) => {
		const feeAmount = Number(fee.feeAmount);
		if (isNaN(feeAmount)) return sum;

		if (fee.unit === 'index') {
			return sum + calculateFeeIndexAmount(feeAmount, fee.lastIndex, fee.firstIndex);
		}

		if (fee.unit === 'room') {
			return sum + calculateFeeUnitQuantityAmount(feeAmount, 1, stayDays);
		}

		if (fee.unit === 'vehicle' || fee.unit === 'person') {
			return sum + calculateFeeUnitQuantityAmount(feeAmount, fee.quantity, stayDays);
		}

		return sum;
	}, 0);

	return totalFees;
};

const calculateTotalFeeAmount = (listFees) => {
	if (!listFees || !Array.isArray(listFees)) return 0;

	return listFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
};

const calculateTotalFeesOther = (listFeesOther) => {
	return listFeesOther.reduce((sum, fee) => sum + Number(fee.amount), 0);
};

module.exports = {
	calculateTotalFees,
	calculateFeeIndexAmount,
	calculateFeeUnitQuantityAmount,
	calculateTotalFeeAmount,
	calculateTotalFeesOther,
};
