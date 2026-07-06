const mongoose = require('mongoose');

exports.getDebtsAndReceiptsUnpaid = (contractId) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(contractId),
			},
		},
		{
			$lookup: {
				from: 'receipts',
				localField: 'depositReceiptId',
				foreignField: '_id',
				as: 'depositReceipt',
			},
		},
		{
			$lookup: {
				from: 'debts',
				localField: '_id',
				foreignField: 'contract',
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$status', 'pending'],
							},
						},
					},
				],
				as: 'debts',
			},
		},
		{
			$lookup: {
				from: 'invoices',
				localField: '_id',
				foreignField: 'contract',
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$locked', false],
									},
									{
										$in: ['$status', ['partial', 'unpaid']],
									},
								],
							},
						},
					},
				],
				as: 'invoicesUnpaid',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				localField: '_id',
				foreignField: 'contract',
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['status', ['unpaid', 'partial']],
									},
									{
										$eq: ['locked', false],
									},
									{
										$in: ['$receiptType', ['incidental', 'debts']],
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
				from: 'fees',
				localField: 'room',
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
			$lookup: {
				from: 'rooms',
				localField: 'room',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							version: 1,
							roomIndex: 1,
							roomState: 1,
						},
					},
				],
				as: 'room',
			},
		},
		{
			$project: {
				_id: 1,
				fees: 1,
				room: {
					$ifNull: [
						{
							$arrayElemAt: ['$room', 0],
						},
						null,
					],
				},
				depositReceipt: {
					$arrayElemAt: ['$depositReceipt', 0],
				},
				invoicesUnpaid: 1,
				receiptsUnpaid: 1,
				contract: {
					rent: '$rent',
					contractCode: '$contractCode',
					contractSignDate: '$contractSignDate',
					contractEndDate: '$contractEndDate',
				},
				debts: 1,
			},
		},
	];
};
