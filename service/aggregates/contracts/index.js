const mongoose = require('mongoose');
const { invoiceStatus, receiptStatus, receiptTypes, debtStatus } = require('../../../constants');

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
								$eq: ['$status', debtStatus['PENDING']],
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
										$in: ['$status', [invoiceStatus['PARTIAL'], invoiceStatus['UNPAID']]],
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
										$in: ['status', [receiptStatus['UNPAID'], receiptStatus['PARTIAL']]],
									},
									{
										$eq: ['locked', false],
									},
									{
										$in: ['$receiptType', [receiptTypes['INCIDENTAL'], receiptTypes['DEBTS']]],
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
						$project: {
							_id: 1,
							feeName: 1,
							unit: 1,
							lastIndex: 1,
							feeKey: 1,
							room: 1,
							feeAmount: 1,
							iconPath: 1,
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
			$set: {
				latestVersion: {
					$ifNull: [
						{
							$first: {
								$sortArray: {
									input: '$versions',
									sortBy: { version: -1 },
								},
							},
						},
						null,
					],
				},
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
					_id: '$_id',
					rent: '$latestVersion.rent',
					contractCode: '$latestVersion.contractCode',
					contractSignDate: '$latestVersion.contractSignDate',
					contractEndDate: '$latestVersion.contractEndDate',
				},
				debts: 1,
			},
		},
	];
};
