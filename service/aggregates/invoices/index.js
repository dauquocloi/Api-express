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
			$lookup: {
				from: 'transactions',
				let: {
					invoiceId: {
						$arrayElemAt: ['$invoiceInfo', 0],
					},
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$invoice', '$$invoiceId._id'],
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
				buildingName: 1,
				roomInfo: 1,
				invoiceInfo: {
					$arrayElemAt: ['$invoiceInfo', 0],
				},
				transactions: {
					$map: {
						input: '$transactions',
						as: 'trans',
						in: {
							_id: '$$trans._id',
							paymentMethod: '$$trans.paymentMethod',
							collector: {
								$ifNull: ['$$trans.collector', null],
							},
						},
					},
				},
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
						transaction: '$transactions',
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
					month: 5,
					year: 2025,
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
				],
				as: 'invoiceRecent',
			},
		},
		{
			$addFields: {
				invoiceStatus: {
					$switch: {
						branches: [
							// nếu mảng invoiceRecent rỗng => chưa có hóa đơn
							{
								case: {
									$eq: [
										{
											$size: '$invoiceRecent',
										},
										0,
									],
								},
								then: false,
							},
							{
								case: {
									$allElementsTrue: {
										$map: {
											input: '$invoiceRecent',
											as: 'inv',
											in: {
												$ne: ['$$inv.invoiceType', 'firstInvoice'],
											},
										},
									},
								},
								then: true,
							},
							{
								case: {
									$gt: [
										{
											$size: '$invoiceRecent',
										},
										1,
									],
								},
								then: true,
							},
							// 2️⃣ createdAt không thuộc tháng hiện tại và stayDays < 30 => false
							{
								case: {
									$anyElementTrue: {
										$map: {
											input: '$invoiceRecent',
											as: 'inv',
											in: {
												$switch: {
													branches: [
														//type === firstInvoice createdAt không cùng tháng & stayDays < 30
														{
															case: {
																$and: [
																	{
																		$eq: ['$$inv.invoiceType', 'firstInvoice'],
																	},
																	{
																		$ne: [
																			{
																				$month: '$$inv.createdAt',
																			},
																			'$month',
																		],
																	},
																	{
																		$lt: ['$$inv.stayDays', 30],
																	},
																],
															},
															then: false,
														},
														//type=firstInvoice & createdAt không cùng tháng & stayDays >= 30
														{
															case: {
																$and: [
																	{
																		$eq: ['$$inv.invoiceType', 'firstInvoice'],
																	},
																	{
																		$ne: [
																			{
																				$month: '$$inv.createdAt',
																			},
																			'$month',
																		],
																	},
																	{
																		$gte: ['$$inv.stayDays', 30],
																	},
																],
															},
															then: true,
														},
														// createdAt cùng tháng
														{
															case: {
																$eq: [
																	{
																		$month: '$$inv.createdAt',
																	},
																	'$month',
																],
															},
															then: true,
														},
													],
													default: false,
												},
											},
										},
									},
								},
								then: true,
							},
						],
						default: false,
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
						{
							$let: {
								vars: {
									filtered: {
										$filter: {
											input: '$invoiceRecent',
											as: 'inv',
											cond: {
												$ne: ['$$inv.invoiceType', 'firstInvoice'],
											},
										},
									},
								},
								in: {
									$cond: [
										{
											$gt: [
												{
													$size: '$$filtered',
												},
												0,
											],
										},
										{
											$first: '$$filtered._id',
										},
										// nếu có invoice != firstInvoice
										{
											$first: '$invoiceRecent._id',
										}, // nếu tất cả là firstInvoice
									],
								},
							},
						},
						null, // nếu invoiceStatus = false => không có invoiceId
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
				invoiceCode: { $regex: new RegExp(`^${invoiceCode}$`, 'i') },
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
};
