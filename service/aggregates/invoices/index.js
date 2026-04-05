const getInvoicePaymentStatus = (buildingId, month, year) => {
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
				as: 'roomInfo',
			},
		},
		{
			$unwind: {
				path: '$roomInfo',
			},
		},
		{
			$lookup: {
				from: 'invoices',
				localField: 'roomInfo._id',
				foreignField: 'room',
				let: {
					currentMonth: month,
					currentYear: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$month', '$$currentMonth'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
									{
										$not: {
											$in: ['$status', ['cencelled', 'terminated', 'pending']],
										},
									},
								],
							},
						},
					},
				],
				as: 'invoiceInfo',
			},
		},
		{
			$unwind: {
				path: '$invoiceInfo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$project: {
				_id: 1,
				buildingName: 1,
				roomInfo: 1,
				invoiceInfo: 1,
			},
		},
		{
			$sort: {
				'roomInfo.roomIndex': 1,
			},
		},
		{
			$group: {
				_id: '$_id',
				listInvoicePaymentStatus: {
					$push: {
						invoiceId: '$invoiceInfo._id',
						roomIndex: '$roomInfo.roomIndex',
						roomId: '$roomInfo._id',
						total: '$invoiceInfo.total',
						month: '$invoiceInfo.month',
						year: '$invoiceInfo.year',
						status: '$invoiceInfo.status',
					},
				},
			},
		},
	];
};

const getInvoicesSendingStatus = (buildingId, currentMonth, currentYear) => {
	return [
		{
			$match: {
				_id: buildingId,
			},
		},
		{
			$addFields: {
				month: currentMonth,
				year: currentYear,
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: '_id',
				foreignField: 'building',
				as: 'roomInfo',
			},
		},
		{
			$unwind: {
				path: '$roomInfo',
			},
		},
		{
			$sort: {
				'roomInfo.roomIndex': 1,
			},
		},
		{
			$lookup: {
				from: 'invoices',
				let: {
					roomObjectId: '$roomInfo._id',
					month: currentMonth,
					year: currentYear,
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
										$eq: ['$month', '$$month'],
									},
									{
										$eq: ['$year', '$$year'],
									},
									{
										$not: {
											$in: ['$status', ['cencelled', 'terminated', 'pending']],
										},
									},
								],
							},
						},
					},
					// {
					// 	$sort: { createdAt: 1 },
					// },
					// {
					// 	$limit: 1,
					// },
				],
				as: 'invoiceRecent',
			},
		},
		{
			$addFields: {
				invoiceStatus: {
					$cond: {
						if: { $eq: [{ $size: '$invoiceRecent' }, 0] },
						then: false,
						else: {
							$anyElementTrue: {
								$map: {
									input: '$invoiceRecent',
									as: 'inv',
									in: {
										$or: [
											// 1. Không phải là firstInvoice thì coi như true
											{ $ne: ['$$inv.invoiceType', 'firstInvoice'] },
											// 2. Là firstInvoice nhưng cùng tháng hiện tại
											{ $eq: [{ $month: '$$inv.createdAt' }, { $month: new Date() }] },
											// 3. Là firstInvoice, khác tháng nhưng ở trên 30 ngày
											{ $gte: ['$$inv.stayDays', 30] },
										],
									},
								},
							},
						},
					},
				},
			},
		},
		{
			$addFields: {
				invoiceId: {
					$cond: [
						{
							$eq: ['$invoiceStatus', true],
						},
						// Nếu status là true
						{
							$first: '$invoiceRecent._id',
						},
						// Lấy ID của phần tử đầu tiên trong mảng
						null, // Nếu status là false
					],
				},
			},
		},
		{
			$group: {
				_id: '$_id',
				listInvoiceInfo: {
					$push: {
						roomId: '$roomInfo._id',
						roomIndex: '$roomInfo.roomIndex',
						invoiceStatus: '$invoiceStatus',
						roomState: '$roomInfo.roomState',
						invoiceId: '$invoiceId',
					},
				},
			},
		},
	];
};

const getInvoiceDetail = (invoiceId) => {
	return [
		{
			$match: {
				_id: invoiceId,
			},
		},
		{
			$lookup: {
				from: 'transactions',
				localField: '_id',
				foreignField: 'invoice',
				as: 'transactionInfo',
			},
		},
		{
			$unwind: {
				path: '$transactionInfo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'transactionInfo.collector',
				foreignField: '_id',
				as: 'collectorInfo',
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
			$project: {
				_id: 1,
				stayDays: 1,
				total: 1,
				paidAmount: 1,
				status: 1,
				month: 1,
				year: 1,
				fee: 1,
				debts: 1,
				payer: 1,
				debts: 1,
				locked: 1,
				fee: 1,
				transactionInfo: 1,
				invoiceContent: 1,
				detuctedInfo: 1,
				version: 1,
				paymentContent: 1,
				room: {
					$let: {
						vars: {
							room: {
								$arrayElemAt: ['$room', 0],
							},
						},
						in: {
							_id: '$$room._id',
							roomIndex: '$$room.roomIndex',
							version: '$$room.version',
						},
					},
				},
				collector: {
					$arrayElemAt: ['$collectorInfo', 0],
				},
			},
		},
		{
			$group: {
				_id: {
					_id: '$_id',
					status: '$status',
					room: '$room',
					total: '$total',
					paidAmount: '$paidAmount',
					month: '$month',
					year: '$year',
					paymentContent: '$paymentContent',
					date: '$date',
					payer: '$payer',
					locked: '$locked',
					debts: '$debts',
					fee: '$fee',
					stayDays: '$stayDays',
					invoiceContent: '$invoiceContent',
					detuctedInfo: '$detuctedInfo',
					version: '$version',
				},
				transactionInfo: {
					$push: {
						$cond: [
							{
								$gt: [
									{
										$ifNull: ['$transactionInfo', null],
									},
									null,
								],
							},
							{
								_id: '$transactionInfo._id',
								transactionDate: '$transactionInfo.transactionDate',
								amount: '$transactionInfo.amount',
								content: '$transactionInfo.content',
								paymentMethod: '$transactionInfo.paymentMethod',
								collector: {
									fullName: '$collector.fullName',
									_id: '$collector._id',
								},
								transactionId: '$transactionInfo.transactionId',
								accountNumber: '$transactionInfo.accountNumber',
								gateway: '$transactionInfo.gateway',
								ownerConfirmed: '$transactionInfo.ownerConfirmed',
								confirmedDate: '$transactionInfo.confirmedDate',
								createdBy: '$transactionInfo.createdBy',
							},
							'$$REMOVE',
						],
					},
				},
			},
		},
	];
};

const getInvoiceInfoByInvoiceCode = (invoiceCode) => {
	return [
		{
			$match: {
				invoiceCode: invoiceCode,
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
				stayDays: 1,
				total: 1,
				status: 1,
				locked: 1,
				month: 1,
				year: 1,
				room: 1,
				fee: 1,
				debts: 1,
				paymentContent: 1,
				payer: 1,
				invoiceCode: 1,
				note: 1,
				createdAt: 1,
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

const findInvoiceInfoByPaymentContent = (paymentContent) => {
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
				invoiceContent: 1,
				total: 1,
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

const getCashCollectorInfo = (invoiceObjectId) => {
	return [
		{
			$match: {
				_id: invoiceObjectId,
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
				invoiceContent: 1,
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

module.exports = {
	getInvoicePaymentStatus,
	getInvoicesSendingStatus,
	getInvoiceDetail,
	getInvoiceInfoByInvoiceCode,
	findInvoiceInfoByPaymentContent,
	getCashCollectorInfo,
};
