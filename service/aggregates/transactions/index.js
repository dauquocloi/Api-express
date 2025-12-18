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

module.exports = { getTransactionsByUserId };
