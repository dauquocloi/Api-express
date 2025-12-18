const getAllBillsPipeline = (buildingId, month, year) => {
	return [
		{
			$match: {
				_id: buildingId,
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
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$ne: ['$status', 'cencelled'],
									},
									{
										$eq: ['$month', '$$month'],
									},
									{
										$eq: ['$year', '$$year'],
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							month: 1,
							year: 1,
							total: 1,
							status: 1,
							paidAmount: 1,
						},
					},
				],
				as: 'invoices',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$ne: ['$status', 'cencelled'],
									},
									{
										$eq: ['$month', '$$month'],
									},
									{
										$eq: ['$year', '$$year'],
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							month: 1,
							year: 1,
							status: 1,
							amount: 1,
							paidAmount: 1,
							receiptType: 1,
						},
					},
				],
				as: 'receipts',
			},
		},
		{
			$project: {
				_id: 1,
				buildingName: 1,
				buildingAddress: 1,
				invoices: 1,
				receipts: 1,
			},
		},
	];
};

const getStatisticGeneral = (buildingObjectId, year) => {
	return [
		{
			$match: {
				building: buildingObjectId,
				year: year,
			},
		},
		{
			$project: {
				_id: 1,
				building: 1,
				year: 1,
				month: 1,
				revenue: 1,
				revenueComparitionRate: 1,
				statisticsStatus: 1,
				expenditure: 1,
				expenditureComparitionRate: 1,
				profit: 1,
				profitComparisonRate: 1,
			},
		},
		{
			$sort: {
				month: 1,
			},
		},
	];
};

module.exports = { getAllBillsPipeline, getStatisticGeneral };
