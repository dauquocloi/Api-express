const listFeeInitial = require('./getListFeeInital');
const { feeUnit } = require('../constants/fees');

const formatInitialFees = (fees) =>
	fees.map((fee) => {
		const matchFee = listFeeInitial.find((feeItem) => feeItem.feeKey === fee.feeKey);

		if (matchFee.unit === feeUnit['INDEX']) {
			return {
				...matchFee,
				feeAmount: fee.feeAmount,
				firstIndex: fee.firstIndex,
				secondIndex: fee.secondIndex,
			};
		} else {
			return {
				...matchFee,
				feeAmount: fee.feeAmount,
				quantity: fee.quantity,
			};
		}
	});

module.exports = formatInitialFees;
