const getTransactionsByUserId = (userObjectId) => {
	return [
		{
			$match: {
				_id: userObjectId,
			},
		},

		{
			$lookup: {
				from: 'transactions',
				localField: '_id',
				foreignField: 'collector',
				pipeline: [
					{
						$project: {
							_id: 1,
							collector: 1,
							amount: 1,
							invoice: 1,
							receipt: 1,
							createdAt: 1,
						},
					},
				],
				as: 'transactionInfos',
			},
		},

		{
			$project: {
				_id: 1,
				fullName: 1,
				transactions: '$transactionInfos',
			},
		},
	];
};

const getAllTransactionsInPeriod = (buildingObjectId, currentMonth, currentYear) => {
	return [
		{
			$match: {
				_id: buildingObjectId,
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: '_id',
				foreignField: 'building',
				as: 'rooms',
			},
		},
		{
			$lookup: {
				from: 'invoices',
				localField: 'rooms._id',
				foreignField: 'room',
				pipeline: [
					{
						$match: {
							month: currentMonth,
							year: currentYear,
							status: {
								$in: ['paid', 'partial', 'unpaid'],
							},
						},
					},
					{
						$lookup: {
							from: 'transactions',
							localField: '_id',
							foreignField: 'receipt',
							as: 'transactions',
						},
					},
				],
				as: 'invoices',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				localField: 'rooms._id',
				foreignField: 'room',
				pipeline: [
					{
						$match: {
							month: currentMonth,
							year: currentYear,
							status: {
								$in: ['paid', 'partial', 'unpaid'],
							},
						},
					},
					{
						$lookup: {
							from: 'transactions',
							localField: '_id',
							foreignField: 'receipt',
							as: 'transactions',
						},
					},
				],
				as: 'receipts',
			},
		},
	];
};

module.exports = { getTransactionsByUserId, getAllTransactionsInPeriod };
