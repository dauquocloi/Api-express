module.exports = function getCheckoutCostDetailPipeline(checkoutCostId) {
	return [
		{
			$match: {
				_id: checkoutCostId,
			},
		},
		{
			$lookup: {
				from: 'receipts',
				localField: 'checkoutCostReceipt',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							amount: 1,
							paidAmount: 1,
							status: 1,
							date: 1,
							receiptContent: 1,
						},
					},
				],
				as: 'checkoutCostReceipt',
			},
		},
		{
			$unwind: {
				path: '$checkoutCostReceipt',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'transactions',
				let: {
					receiptId: '$checkoutCostReceipt._id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$receipt', '$$receiptId'],
							},
						},
					},
					{
						$lookup: {
							from: 'users',
							localField: 'collector',
							foreignField: '_id',
							pipeline: [
								{
									$project: {
										_id: 1,
										fullName: 1,
									},
								},
							],
							as: 'collector',
						},
					},
					{
						$unwind: {
							path: '$collector',
							preserveNullAndEmptyArrays: true,
						},
					},
				],
				as: 'transactions',
			},
		},
		{
			$lookup: {
				from: 'invoices',
				localField: 'invoiceUnpaid',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							month: 1,
							year: 1,
							invoiceContent: 1,
							total: 1,
							paidAmount: 1,
						},
					},
				],
				as: 'invoiceUnpaid',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				localField: 'receiptsUnpaid',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							amount: 1,
							paidAmount: 1,
							receiptContent: 1,
						},
					},
				],
				as: 'receiptsUnpaid',
			},
		},
		{
			$lookup: {
				from: 'contracts',
				localField: 'contractId',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							contractCode: 1,
							contractSignDate: 1,
							contractEndDate: 1,
						},
					},
				],
				as: 'contract',
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'roomId',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							roomIndex: 1,
						},
					},
				],
				as: 'room',
			},
		},
		{
			$lookup: {
				from: 'buildings',
				localField: 'buildingId',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							buildingName: 1,
							buildingAddress: 1,
						},
					},
				],
				as: 'building',
			},
		},
		{
			$lookup: {
				from: 'debts',
				localField: 'debts',
				foreignField: '_id',
				as: 'debts',
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'creatorId',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							fullName: 1,
						},
					},
				],
				as: 'creator',
			},
		},
		{
			$addFields: {
				contract: {
					$ifNull: [
						{
							$first: '$contract',
						},
						null,
					],
				},
				creator: {
					$ifNull: [
						{
							$first: '$creator',
						},
						null,
					],
				},
				building: {
					$ifNull: [
						{
							$first: '$building',
						},
						null,
					],
				},
				room: {
					$ifNull: [
						{
							$first: '$room',
						},
						null,
					],
				},
				invoiceUnpaid: {
					$ifNull: [
						{
							$first: '$invoiceUnpaid',
						},
						null,
					],
				},
			},
		},
	];
};
