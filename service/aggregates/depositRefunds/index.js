const getDepositRefundsModePendingPipeline = (buildingId) => {
	return [
		{
			$match: {
				building: buildingId,
				status: 'pending',
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'room',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							roomIndex: 1,
							roomState: 1,
						},
					},
				],
				as: 'roomInfo',
			},
		},
		{
			$unwind: {
				path: '$roomInfo',
			},
		},

		{
			$project: {
				_id: 1,
				status: 1,
				depositRefundAmount: 1,
				roomIndex: '$roomInfo.roomIndex',
				createdAt: 1,
			},
		},
		{
			$sort: {
				createdAt: -1,
			},
		},
	];
};

const getDepositRefundsModeRefundedPipeline = (buildingId) => {
	return [
		{
			$match: {
				building: buildingId,
				status: 'paid',
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'room',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							roomIndex: 1,
							roomState: 1,
						},
					},
				],
				as: 'roomInfo',
			},
		},
		{
			$unwind: {
				path: '$roomInfo',
			},
		},

		{
			$project: {
				_id: 1,
				status: 1,
				depositRefundAmount: 1,
				roomIndex: '$roomInfo.roomIndex',
				createdAt: 1,
			},
		},
		{
			$sort: {
				roomIndex: 1,
				createdAt: -1,
			},
		},
	];
};

const getDepositRefundDetailPipeline = (depositRefundId) => {
	return [
		{
			$match: {
				_id: depositRefundId,
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'room',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							roomIndex: 1,
							roomState: 1,
						},
					},
				],
				as: 'room',
			},
		},
		{
			$lookup: {
				from: 'buildings',
				localField: 'building',
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
				from: 'contracts',
				localField: 'contract',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							contractSignDate: 1,
							contractEndDate: 1,
							contractCode: 1,
						},
					},
				],
				as: 'contract',
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'creator',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							fullName: 1,
							role: 1,
						},
					},
				],
				as: 'creator',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				localField: 'depositReceipt',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							paidAmount: 1,
						},
					},
				],
				as: 'depositReceipt',
			},
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'contractOwner',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							fullName: 1,
							paymentInfo: 1,
						},
					},
				],
				as: 'contractOwner',
			},
		},
		{
			$lookup: {
				from: 'debts',
				localField: 'debts',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							content: 1,
							amount: 1,
						},
					},
				],
				as: 'debts',
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
							total: 1,
							paidAmount: 1,
							month: 1,
							year: 1,
							invoiceContent: 1,
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
							receiptContent: 1,
							paidAmount: 1,
							date: 1,
						},
					},
				],
				as: 'receiptsUnpaid',
			},
		},

		{
			$addFields: {
				room: {
					$first: '$room',
				},
				building: {
					$first: '$building',
				},
				contract: {
					$first: '$contract',
				},
				creator: {
					$first: '$creator',
				},
				depositReceipt: {
					$first: '$depositReceipt',
				},
				contractOwner: {
					$first: '$contractOwner',
				},
				depositReceipt: {
					$first: '$depositReceipt',
				},
				invoiceUnpaid: {
					$first: '$invoiceUnpaid',
				},
			},
		},
	];
};
module.exports = { getDepositRefundsModePendingPipeline, getDepositRefundsModeRefundedPipeline, getDepositRefundDetailPipeline };
