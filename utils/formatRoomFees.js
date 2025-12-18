const { calculateFeeIndexAmount, calculateFeeUnitQuantityAmount } = require('./calculateFeeTotal');

exports.formatRoomFees = (roomFees, feeIndexValues, stayDays) => {
	return roomFees.map((fee) => {
		if (fee.unit === 'vehicle') {
			return {
				...fee,
				quantity: fee.vehicleInfo?.length ?? 0,
				amount: calculateFeeUnitQuantityAmount(fee.feeAmount, fee.quantity, stayDays),
			};
		} else if (fee.unit === 'person') {
			return {
				...fee,
				quantity: fee.customerInfo?.length ?? 0,
				amount: calculateFeeUnitQuantityAmount(fee.feeAmount, fee.quantity, stayDays),
			};
		} else if (fee.unit === 'room') {
			return {
				...fee,
				quantity: 1,
				amount: calculateFeeUnitQuantityAmount(fee.feeAmount, fee.quantity, stayDays),
			};
		} else if (fee.unit === 'index') {
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
