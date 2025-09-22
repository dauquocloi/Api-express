const formateFee = (listFees) => {
	const unitPriority = {
		room: 1,
		vehicle: 2,
		person: 3,
		index: 4,
		other: 5,
	};

	const listFeesSorted = [...listFees]
		.map((fee) => ({
			...fee,
			feeKey: fee.feeKey?.slice(0, -2) || fee.feeKey, // cắt 2 ký tự cuối nếu có
		}))
		.sort((a, b) => {
			const priorityA = unitPriority[a.unit] || Infinity;
			const priorityB = unitPriority[b.unit] || Infinity;

			if (priorityA !== priorityB) {
				return priorityA - priorityB;
			}

			return b.amount - a.amount;
		});

	return listFeesSorted;
};

module.exports = formateFee;
