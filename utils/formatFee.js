const formateFee = (listFees) => {
	const unitPriority = {
		room: 1,
		vehicle: 2,
		person: 3,
		index: 4,
		other: 5,
	};

	const listFeesSorted = [...listFees].sort((a, b) => {
		const priorityA = unitPriority[a.unit] || Infinity;
		const priorityB = unitPriority[b.unit] || Infinity;

		if (priorityA !== priorityB) {
			return priorityA - priorityB;
		}

		// Nếu unit giống nhau => thêm logic phụ
		return b.amount - a.amount;
	});

	return listFeesSorted;
};

module.exports = formateFee;
