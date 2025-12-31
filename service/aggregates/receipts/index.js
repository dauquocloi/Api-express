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
				_id: receiptObjectId,
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: 'room',
				foreignField: '_id',
				as: 'roomInfo',
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
			$unwind: {
				path: '$transactions',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'transactions.collector',
				foreignField: '_id',
				as: 'collectorInfo',
			},
		},
		{
			$project: {
				_id: 1,
				status: 1,
				room: {
					$let: {
						vars: {
							roomObj: {
								$arrayElemAt: ['$roomInfo', 0],
							},
						},
						in: {
							_id: '$$roomObj._id',
							roomIndex: '$$roomObj.roomIndex',

							// thêm các trường khác nếu cần
						},
					},
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
				collectorInfo: {
					$arrayElemAt: ['$collectorInfo', 0],
				},
				detuctedInfo: 1,
				version: 1,
			},
		},
		{
			$group: {
				_id: {
					_id: '$_id',
					status: '$status',
					room: '$room',
					receiptContent: '$receiptContent',
					amount: '$amount',
					month: '$month',
					year: '$year',
					paymentContent: '$paymentContent',
					date: '$date',
					payer: '$payer',
					locked: '$locked',
					paidAmount: '$paidAmount',
					detuctedInfo: '$detuctedInfo',
					version: '$version',
				},
				transactionInfo: {
					$push: {
						$cond: [
							{
								$gt: [{ $ifNull: ['$transactions', null] }, null],
							},
							{
								_id: '$transactions._id',
								transactionDate: '$transactions.transactionDate',
								amount: '$transactions.amount',
								content: '$transactions.content',
								paymentMethod: '$transactions.paymentMethod',
								collector: {
									fullName: '$collectorInfo.fullName',
									_id: '$collectorInfo._id',
								},
								transactionId: '$transactions.transactionId',
								accountNumber: '$transactions.accountNumber',
								gateway: '$transactions.gateway',
							},
							'$$REMOVE',
						],
					},
				},
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
			$addFields: {
				buildingId: {
					$getField: {
						field: 'building',
						input: {
							$arrayElemAt: ['$roomInfo', 0],
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'banks',
				let: {
					buildingObjectId: '$buildingId',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$$buildingObjectId', '$building'],
							},
						},
					},
				],
				as: 'transferInfo',
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

				roomIndex: {
					$getField: {
						field: 'roomIndex',
						input: {
							$arrayElemAt: ['$roomInfo', 0],
						},
					},
				},
				transferInfo: {
					$arrayElemAt: ['$transferInfo', 0],
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
						},
					},
				],
				as: 'receiver',
			},
		},
		{
			$project:
				/**
				 * specifications: The fields to
				 *   include or exclude.
				 */
				{
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
