const mongoose = require('mongoose');
const { invoiceStatus: INVOICE_STATUS, invoiceType: INVOICE_TYPE } = require('../../../constants/invoices');
const { contractStatus: CONTRACT_STATUS } = require('../../../constants/contracts');

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
					{
						$lookup: {
							from: 'transactions',
							localField: '_id',
							foreignField: 'invoice',
							as: 'transactions',
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
				transactions: {
					$map: {
						input: '$invoiceInfo.transactions',
						as: 'trans',
						in: {
							_id: '$$trans._id',
							paymentMethod: '$$trans.paymentMethod',
							collector: {
								$ifNull: ['$$trans.collector', null],
							},
							ownerConfirmed: '$$trans.ownerConfirmed',
							createdBy: '$$trans.createdBy',
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
						transactions: '$transactions',
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
				_id: new mongoose.Types.ObjectId(buildingId),
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: '_id',
				foreignField: 'building',
				pipeline: [
					{
						$sort: {
							roomIndex: 1,
						},
					},
					{
						$lookup: {
							from: 'contracts',
							localField: '_id',
							foreignField: 'room',
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{
													$in: ['$status', [CONTRACT_STATUS['ACTIVE']]],
												},
											],
										},
									},
								},
							],
							as: 'contract',
						},
					},
					{
						$set: {
							contract: {
								$arrayElemAt: ['$contract', 0],
							},
						},
					},
					{
						$lookup: {
							from: 'invoices',
							localField: 'contract._id',
							foreignField: 'contract',
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{
													$in: ['$status', [INVOICE_STATUS['UNPAID'], INVOICE_STATUS['PARTIAL'], INVOICE_STATUS['PAID']]],
												},
												{
													$eq: ['$month', currentMonth],
												},
												{
													$eq: ['$year', currentYear],
												},
											],
										},
									},
								},
								{
									$sort: {
										createdAt: -1,
									},
								},
							],
							as: 'invoices',
						},
					},
					{
						$addFields: {
							invoiceStatus: {
								$cond: {
									if: {
										$eq: [{ $size: '$invoices' }, 0],
									},
									then: false,
									else: {
										$anyElementTrue: {
											$map: {
												input: '$invoices',
												as: 'inv',
												in: {
													$or: [
														// 1. Không phải là firstInvoice thì coi như true
														{
															$ne: ['$$inv.invoiceType', INVOICE_TYPE['FIRST_INVOICE']],
														},
														// 2. Là firstInvoice nhưng cùng tháng hiện tại
														{
															$eq: [
																{
																	$month: '$$inv.createdAt',
																},
																{
																	$month: new Date(),
																},
															],
														},
														// 3. Là firstInvoice, khác tháng nhưng ở trên 30 ngày
														{
															$gte: ['$$inv.stayDays', 30],
														},
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
						$project: {
							_id: 0,
							roomId: '$_id',
							roomIndex: 1,
							roomState: 1,
							invoiceStatus: 1,
							invoiceId: {
								$ifNull: [
									{
										$arrayElemAt: ['$invoices._id', 0],
									},
									null,
								],
							},
						},
					},
				],
				as: 'listInvoiceInfo',
			},
		},
		{
			$project: {
				_id: 1,
				listInvoiceInfo: 1,
			},
		},
	];
};

const getInvoiceDetail = (invoiceId) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(invoiceId),
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
				foreignField: 'invoice',
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
				stayDays: 1,
				total: 1,
				paidAmount: 1,
				status: 1,
				month: 1,
				year: 1,
				fee: 1,
				debts: 1,
				payer: 1,
				room: {
					$ifNull: [
						{
							$first: '$roomInfo',
						},
						null,
					],
				},
				locked: 1,
				fee: 1,
				transactions: 1,
				invoiceContent: 1,
				detuctedInfo: 1,
				version: 1,
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
			$addFields: {
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
