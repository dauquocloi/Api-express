const mongoose = require('mongoose');

const getReceiptPaymentStatus = (buildingId, month, year) => {
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
			$unwind: {
				path: '$rooms',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				let: {
					roomId: '$rooms._id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$room', '$$roomId'],
									},
									{
										$eq: ['$month', month],
									},
									{
										$eq: ['$year', year],
									},
									{
										$in: ['$status', ['partial', 'paid', 'unpaid', 'cancelled']],
									},
								],
							},
						},
					},
				],
				as: 'receipts',
			},
		},
		{
			$lookup: {
				from: 'transactions',
				let: {
					receiptIds: {
						$map: {
							input: '$receipts',
							as: 'r',
							in: '$$r._id',
						},
					},
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$receipt', '$$receiptIds'],
							},
						},
					},
				],
				as: 'transactions',
			},
		},
		{
			$project: {
				_id: 1,
				rooms: {
					_id: '$rooms._id',
					roomIndex: '$rooms.roomIndex',
				},
				receipts: {
					$map: {
						input: '$receipts',
						as: 'receipt',
						in: {
							amount: '$$receipt.amount',
							status: '$$receipt.status',
							_id: '$$receipt._id',
							transaction: {
								$map: {
									input: {
										$filter: {
											input: '$transactions',
											as: 'transaction',
											cond: {
												$eq: ['$$transaction.receipt', '$$receipt._id'],
											},
										},
									},
									as: 't',
									in: {
										_id: '$$t._id',
										paymentMethod: '$$t.paymentMethod',
										collector: '$$t.collector',
										ownerConfirmed: '$$t.ownerConfirmed',
										createdBy: '$$t.createdBy',
									},
								},
							},
						},
					},
				},
			},
		},
		{
			$sort: {
				'rooms.roomIndex': 1,
			},
		},
		{
			$match: {
				'receipts.0': {
					$exists: true,
				},
			},
		},
		{
			$group: {
				_id: '$_id',
				receipts: {
					$push: {
						room: '$rooms',
						receiptInfo: '$receipts',
					},
				},
			},
		},
	];
};

const getReceiptDetail = (receiptObjectId) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(receiptObjectId),
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
			$lookup: {
				from: 'transactions',
				localField: '_id',
				foreignField: 'receipt',
				pipeline: [
					{
						$lookup: {
							from: 'users',
							localField: 'collector',
							foreignField: '_id',
							pipeline: [
								{
									$project: {
										fullName: 1,
										_id: 1,
									},
								},
							],
							as: 'collectorInfo',
						},
					},
					{
						$set: {
							collectorInfo: {
								$ifNull: [
									{
										$first: '$collectorInfo',
									},
									null,
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							transactionDate: 1,
							amount: 1,
							content: 1,
							paymentMethod: 1,
							collector: '$collectorInfo',
							transactionId: 1,
							accountNumber: 1,
							gateway: 1,
							ownerConfirmed: 1,
							confirmedDate: 1,
							createdBy: 1,
							version: 1,
							month: 1,
							year: 1,
							ownerDeclinedReason: 1,
						},
					},
				],
				as: 'transactions',
			},
		},

		{
			$project: {
				_id: 1,
				status: 1,
				room: {
					$ifNull: [
						{
							$first: '$roomInfo',
						},
						null,
					],
				},
				receiptContent: 1,
				amount: 1,
				month: 1,
				year: 1,
				paymentContent: 1,
				date: 1,
				payer: 1,
				locked: 1,
				transactions: 1,
				paidAmount: 1,
				detuctedInfo: 1,
				version: 1,
			},
		},
	];
};

const getDepositReceiptDetail = (receiptObjectId) => {
	return [
		{
			$match: {
				_id: receiptObjectId,
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
		{
			$group: {
				_id: null,
				allTransactions: {
					$push: '$transactions',
				},
				docs: {
					$push: '$$ROOT',
				}, // gom tất cả doc vào mảng
			},
		},
		{
			$addFields: {
				mainReceipt: {
					$arrayElemAt: [
						{
							$filter: {
								input: '$docs',
								as: 'doc',
								cond: {
									$ne: ['$$doc.status', 'cancelled'],
								},
							},
						},
						0,
					],
				},
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'mainReceipt.room',
				foreignField: '_id',
				as: 'roomInfo',
			},
		},
		{
			$project: {
				_id: 0,
				mainReceipt: {
					$mergeObjects: [
						{
							_id: '$mainReceipt._id',
							receiptType: '$mainReceipt.receiptType',
							status: '$mainReceipt.status',
							locked: '$mainReceipt.locked',
							receiptContent: '$mainReceipt.receiptContent',
							amount: '$mainReceipt.amount',
							paymentContent: '$mainReceipt.paymentContent',
							date: '$mainReceipt.date',
							payer: '$mainReceipt.payer',
						},
						{
							roomInfo: {
								$let: {
									vars: {
										room: {
											$arrayElemAt: ['$roomInfo', 0],
										},
									},
									in: {
										_id: '$$room._id',
										roomIndex: '$$room.roomIndex',
									},
								},
							},
						},
					],
				},
				allTransactions: {
					$reduce: {
						input: '$allTransactions',
						initialValue: [],
						in: {
							$concatArrays: ['$$value', '$$this'],
						},
					},
				},
			},
		},
		{
			$unwind: {
				path: '$allTransactions',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'allTransactions.collector',
				foreignField: '_id',
				as: 'collectorInfo',
			},
		},
		{
			$unwind: {
				path: '$collectorInfo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$set: {
				'allTransactions.collector': {
					_id: '$collectorInfo._id',
					fullName: '$collectorInfo.fullName',
				},
			},
		},
		{
			$group: {
				_id: null,
				receipt: {
					$first: '$mainReceipt',
				},
				transactions: {
					$push: '$allTransactions',
				},
			},
		},
	];
};

const getCurrentReceiptAndTransaction = (receiptObjectId) => {
	return [
		{
			$match: {
				_id: receiptObjectId,
			},
		},
		{
			$lookup: {
				from: 'transactions',
				localField: '_id',
				foreignField: 'receipt',
				as: 'transactionInfo',
			},
		},
	];
};

const getReceiptInfoByReceiptCode = (receiptCode) => {
	return [
		{
			$match: {
				receiptCode: receiptCode,
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
							building: 1,
						},
					},
				],
				as: 'roomInfo',
			},
		},
		{
			$lookup: {
				from: 'buildings',
				localField: 'roomInfo.building',
				foreignField: '_id',
				as: 'building',
			},
		},
		{
			$lookup: {
				from: 'bankAccounts',
				localField: 'building.paymentInfo',
				foreignField: '_id',
				pipeline: [
					{
						$lookup: {
							from: 'banks',
							localField: 'bank',
							foreignField: '_id',
							pipeline: [
								{
									$project: {
										_id: 0,
										bin: 0,
									},
								},
							],
							as: 'bank',
						},
					},
				],
				as: 'transferInfo',
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'creater',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 0,
							fullName: 1,
						},
					},
				],
				as: 'creater',
			},
		},
		{
			$project: {
				_id: 1,
				amount: 1,
				status: 1,
				locked: 1,
				month: 1,
				year: 1,
				room: 1,
				receiptContent: 1,
				paidAmount: 1,
				paymentContent: 1,
				payer: 1,
				invoiceCode: 1,
				creater: {
					$ifNull: [
						{
							$first: '$creater',
						},
						null,
					],
				},
				roomIndex: {
					$getField: {
						field: 'roomIndex',
						input: {
							$arrayElemAt: ['$roomInfo', 0],
						},
					},
				},
				transferInfo: {
					$ifNull: [
						{
							$first: {
								$map: {
									input: '$transferInfo',
									as: 'trans',
									in: {
										_id: '$$trans._id',
										accountNumber: '$$trans.accountNumber',
										accountName: '$$trans.accountName',
										bank: {
											$arrayElemAt: ['$$trans.bank', 0],
										},
									},
								},
							},
						},
						null,
					],
				},
			},
		},
	];
};

const getCashCollectorInfo = (receiptObjectId) => {
	return [
		{
			$match: {
				_id: receiptObjectId,
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'room',
				foreignField: '_id',
				as: 'room',
			},
		},
		{
			$unwind: {
				path: '$room',
			},
		},
		{
			$lookup: {
				from: 'buildings',
				localField: 'room.building',
				foreignField: '_id',
				as: 'building',
			},
		},
		{
			$addFields:
				/**
				 * newField: The new field name.
				 * expression: The new field expression.
				 */
				{
					building: {
						$first: '$building',
					},
				},
		},
		{
			$lookup: {
				from: 'users',
				let: {
					management: '$building.management',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: [
									'$_id',
									{
										$map: {
											input: {
												$filter: {
													input: '$$management',
													as: 'm',
													cond: {
														$eq: ['$$m.role', 'owner'],
													},
												},
											},
											as: 'owner',
											in: '$$owner.user',
										},
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							expoPushToken: 1,
							fullName: 1,
							role: 1,
							notificationSetting: 1,
						},
					},
				],
				as: 'receiver',
			},
		},
		{
			$project: {
				_id: 1,
				status: 1,
				receiptContent: 1,
				room: {
					_id: '$room._id',
					roomIndex: '$room.roomIndex',
				},
				building: {
					_id: '$building._id',
					buildingName: '$building.buildingName',
				},
				receiver: {
					$first: '$receiver',
				},
			},
		},
	];
};

const getReceiptByPaymentContent = (paymentContent) => {
	return [
		{
			$match: {
				paymentContent: paymentContent,
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'room',
				foreignField: '_id',
				as: 'room',
			},
		},
		{
			$unwind: {
				path: '$room',
			},
		},
		{
			$lookup: {
				from: 'buildings',
				localField: 'room.building',
				foreignField: '_id',
				as: 'building',
			},
		},
		{
			$lookup: {
				from: 'bankAccounts',
				localField: 'building.paymentInfo',
				foreignField: '_id',
				as: 'paymentInfo',
			},
		},
		{
			$addFields: {
				buildingId: {
					$first: '$building._id',
				},
				management: {
					$first: '$building.management',
				},
				buildingName: {
					$first: '$building.buildingName',
				},
				paymentInfo: {
					$ifNull: [
						{
							$first: '$paymentInfo',
						},
						null,
					],
				},
			},
		},
		{
			$project: {
				_id: 1,
				receiptContent: 1,
				amount: 1,
				paidAmount: 1,
				status: 1,
				locked: 1,
				detuctedInfo: 1,
				version: 1,
				room: {
					_id: '$room._id',
					roomIndex: '$room.roomIndex',
				},
				buildingId: 1,
				management: 1,
				buildingName: 1,
				paymentInfo: 1,
			},
		},
	];
};

module.exports = {
	getReceiptPaymentStatus,
	getReceiptDetail,
	getDepositReceiptDetail,
	getCurrentReceiptAndTransaction,
	getReceiptInfoByReceiptCode,
	getCashCollectorInfo,
	getReceiptByPaymentContent,
};
