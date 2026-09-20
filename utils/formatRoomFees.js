const { calculateFeeIndexAmount, calculateFeeUnitQuantityAmount } = require('./calculateFeeTotal');
const { feeUnit } = require('../constants');

exports.formatRoomFees = (roomFees, feeIndexValues, stayDays) => {
	return roomFees.map((fee) => {
		if (fee.unit === feeUnit['VEHICLE']) {
			return {
				...fee,
				quantity: fee.vehicleInfo?.length ?? 0,
				amount: calculateFeeUnitQuantityAmount(fee.feeAmount, fee.quantity, stayDays),
			};
		} else if (fee.unit === feeUnit['PERSON']) {
			return {
				...fee,
				quantity: fee.customerInfo?.length ?? 0,
				amount: calculateFeeUnitQuantityAmount(fee.feeAmount, fee.quantity, stayDays),
			};
		} else if (fee.unit === feeUnit['ROOM']) {
			return {
				...fee,
				quantity: 1,
				amount: calculateFeeUnitQuantityAmount(fee.feeAmount, fee.quantity, stayDays),
			};
		} else if (fee.unit === feeUnit['INDEX']) {
			const firstIndex = Number(feeIndexValues[fee._id]?.firstIndex);
			const lastIndex = Number(feeIndexValues[fee._id]?.secondIndex);
			if (isNaN(firstIndex) || isNaN(lastIndex)) return fee;
			return {
				...fee,
				firstIndex,
				lastIndex,
				amount: calculateFeeIndexAmount(fee.feeAmount, lastIndex, firstIndex),
			};
		} else {
			return fee;
		}
	});
};
