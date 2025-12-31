module.exports = function getDebtsAndReceiptUnpaidPipeline(roomObjectId, currentMonth, currentYear) {
	return [
		{
			$match: {
				_id: roomObjectId,
			},
		},
		{
			$lookup: {
				from: 'receipts',
				let: {
					roomObjectId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$room', '$$roomObjectId'],
									},
									{
										$eq: ['$receiptType', 'deposit'],
									},
									{
										$eq: ['$isActive', true],
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							amount: 1,
							paidAmount: 1,
							isActive: 1,
							version: 1,
						},
					},
				],
				as: 'receiptDeposit',
			},
		},
		{
			$lookup: {
				from: 'debts',
				let: {
					roomObjectId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$room', '$$roomObjectId'],
									},
									{
										$eq: ['$status', 'pending'],
									},
								],
							},
						},
					},
				],
				as: 'debts',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				let: {
					roomObjectId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$room', '$$roomObjectId'],
									},
									{
										$in: ['$receiptType', ['incidental', 'debts']],
									},
									{
										$not: {
											$in: ['$status', ['terminated', 'cancelled', 'paid']],
										},
									},
									{
										$eq: ['$locked', false],
									},
								],
							},
						},
					},
				],
				as: 'receiptsUnpaid',
			},
		},
		{
			$lookup: {
				from: 'invoices',
				localField: '_id',
				foreignField: 'room',
				pipeline: [
					{
						$match: {
							month: currentMonth,
							year: currentYear,
							status: {
								$in: ['unpaid', 'partial'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							month: 1,
							year: 1,
							status: 1,
							paidAmount: 1,
							total: 1,
							invoiceContent: 1,
							version: 1,
						},
					},
				],
				as: 'invoiceUnpaid',
			},
		},

		{
			$lookup: {
				from: 'fees',
				localField: '_id',
				foreignField: 'room',
				pipeline: [
					{
						$match: {
							unit: {
								$eq: 'index',
							},
						},
					},
					{
						$project: {
							_id: 1,
							feeName: 1,
							unit: 1,
							lastIndex: 1,
							feeKey: 1,
							room: 1,
							feeAmount: 1,
						},
					},
				],
				as: 'fees',
			},
		},

		{
			$addFields: {
				receiptDeposit: {
					$arrayElemAt: ['$receiptDeposit', 0],
				},
				invoiceUnpaid: {
					$ifNull: [
						{
							$arrayElemAt: ['$invoiceUnpaid', 0],
						},
						null,
					],
				},
			},
		},
	];
};
