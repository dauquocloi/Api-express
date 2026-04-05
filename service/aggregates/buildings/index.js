const { vehicleStatus } = require('../../../constants/vehicle');
const { debtStatus } = require('../../../constants/debts');
const { invoiceStatus } = require('../../../constants/invoices');
const { receiptStatus } = require('../../../constants/receipt');

const getAllBillsPipeline = (buildingId, month, year) => {
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
			$lookup: {
				from: 'invoices',
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$ne: ['$status', 'cencelled'],
									},
									{
										$eq: ['$month', '$$month'],
									},
									{
										$eq: ['$year', '$$year'],
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							month: 1,
							year: 1,
							total: 1,
							status: 1,
							paidAmount: 1,
						},
					},
				],
				as: 'invoices',
			},
		},
		{
			$lookup: {
				from: 'receipts',
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$ne: ['$status', 'cencelled'],
									},
									{
										$eq: ['$month', '$$month'],
									},
									{
										$eq: ['$year', '$$year'],
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							month: 1,
							year: 1,
							status: 1,
							amount: 1,
							paidAmount: 1,
							receiptType: 1,
						},
					},
				],
				as: 'receipts',
			},
		},
		{
			$project: {
				_id: 1,
				buildingName: 1,
				buildingAddress: 1,
				invoices: 1,
				receipts: 1,
			},
		},
	];
};

const getStatisticGeneral = (buildingObjectId, year) => {
	return [
		{
			$match: {
				building: buildingObjectId,
				year: year,
			},
		},
		{
			$project: {
				_id: 1,
				building: 1,
				year: 1,
				month: 1,
				revenue: 1,
				revenueComparitionRate: 1,
				statisticsStatus: 1,
				expenditure: 1,
				expenditureComparitionRate: 1,
				profit: 1,
				profitComparisonRate: 1,
			},
		},
		{
			$sort: {
				month: 1,
			},
		},
	];
};

const getPrepareFinanceSettlementData = (buildingObjectId, currentMonth, currentYear) => {
	return [
		{
			$match: {
				_id: buildingObjectId,
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
			$lookup: {
				from: 'receipts',
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					currentMonth: currentMonth,
					currentYear: currentYear,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$eq: ['$month', '$$currentMonth'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
									{
										$eq: ['$status', 'unpaid'],
									},
									{ $eq: ['$locked', false] },
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
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					currentMonth: currentMonth,
					currentYear: currentYear,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$eq: ['$month', '$$currentMonth'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
									{
										$eq: ['$status', 'unpaid'],
									},
									{ $eq: ['$locked', false] },
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
				from: 'depositRefunds',
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					currentMonth: currentMonth,
					currentYear: currentYear,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$eq: ['$month', '$$currentMonth'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
									{
										$eq: ['$status', 'pending'],
									},
								],
							},
						},
					},
				],
				as: 'depositRefundsUnpaid',
			},
		},
		{
			$lookup: {
				from: 'checkoutCosts',
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					currentMonth: currentMonth,
					currentYear: currentYear,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$roomId', '$$roomIds'],
									},
									{
										$eq: ['$month', '$$currentMonth'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
									{
										$eq: ['$status', 'pending'],
									},
								],
							},
						},
					},
				],
				as: 'checkoutCostsUnpaid',
			},
		},
		{
			$set: {
				depositRefundsUnpaid: {
					$map: {
						input: '$depositRefundsUnpaid',
						as: 'refund',
						in: {
							$mergeObjects: [
								'$$refund',
								{
									roomInfo: {
										$let: {
											vars: {
												foundRoom: {
													$arrayElemAt: [
														{
															$filter: {
																input: '$rooms',
																as: 'room',
																cond: { $eq: ['$$room._id', '$$refund.room'] },
															},
														},
														0,
													],
												},
											},
											in: {
												_id: '$$foundRoom._id',
												roomIndex: '$$foundRoom.roomIndex',
											},
										},
									},
								},
							],
						},
					},
				},
			},
		},
	];
};

const getFinanceSettlementData = (buildingObjectId, currentMonth, currentYear) => {
	return [
		{
			$match: {
				_id: buildingObjectId,
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
			$lookup: {
				from: 'invoices',
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					currentMonth: currentMonth,
					currentYear: currentYear,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$eq: ['$month', '$$currentMonth'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
									{
										$not: {
											$in: ['$status', ['terminated', 'pending']],
										},
									},
									{
										$ne: ['$locked', true],
									},
								],
							},
						},
					},
				],
				as: 'invoices',
			},
		},

		{
			$lookup: {
				from: 'receipts',
				let: {
					roomIds: {
						$map: {
							input: '$rooms',
							as: 'r',
							in: '$$r._id',
						},
					},
					currentMonth: currentMonth,
					currentYear: currentYear,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$room', '$$roomIds'],
									},
									{
										$eq: ['$month', '$$currentMonth'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
									{
										$not: {
											$in: ['$status', ['terminated', 'pending']],
										},
									},
									{
										$ne: ['$locked', true],
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
				from: 'incidentalRevenues',
				let: {
					buildingId: '$_id',
					currentMonth: currentMonth,
					currentYear: currentYear,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$building', '$$buildingId'],
									},
									{
										$eq: ['$month', '$$currentYear'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
								],
							},
						},
					},
				],
				as: 'incidentalRevenues',
			},
		},
		{
			$lookup: {
				from: 'expenditures',
				let: {
					buildingId: '$_id',
					currentMonth: currentMonth,
					currentYear: currentYear,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$building', '$$buildingId'],
									},
									{
										$eq: ['$month', '$$currentYear'],
									},
									{
										$eq: ['$year', '$$currentYear'],
									},
								],
							},
						},
					},
				],
				as: 'expenditures',
			},
		},
		{
			$lookup: {
				from: 'periodicExpenditures',
				localField: '_id',
				foreignField: 'building',
				as: 'periodicExpenditures',
			},
		},
		{
			$project: {
				_id: 1,
				rooms: 1,
				invoices: 1,
				receipts: 1,
				incidentalRevenues: 1,
				expenditures: 1,
				periodicExpenditures: 1,
			},
		},
	];
};

const getAllInvoicesInPeriod = (buildingObjectId, month, year) => {
	return [
		{
			$match: {
				_id: buildingObjectId,
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
			$lookup: {
				from: 'invoices',
				localField: 'rooms._id',
				foreignField: 'room',
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$month', month],
									},
									{
										$eq: ['$year', year],
									},
									{
										$in: ['$status', ['paid', 'partial', 'unpaid']],
									},
								],
							},
						},
					},
				],
				as: 'invoices',
			},
		},
	];
};

const getExcelData = (buildingObjectId, month, year) => {
	return [
		{
			$match: {
				_id: buildingObjectId,
			},
		},
		{
			$lookup: {
				from: 'rooms',
				localField: '_id',
				foreignField: 'building',
				pipeline: [
					{
						$lookup: {
							from: 'fees',
							localField: '_id',
							foreignField: 'room',
							pipeline: [
								{
									$lookup: {
										from: 'feeIndexHistory',
										localField: '_id',
										foreignField: 'fee',
										pipeline: [
											{
												$project: {
													feeKey: 1,
													prevIndex: 1,
													lastIndex: 1,
													room: 1,
												},
											},
										],
										as: 'feeIndexHistory',
									},
								},
								{
									$project: {
										feeKey: 1,
										feeAmount: 1,
										feeName: 1,
										unit: 1,
										room: 1,
										feeIndexHistory: {
											$ifNull: [{ $arrayElemAt: ['$feeIndexHistory', 0] }, null],
										},
									},
								},
							],
							as: 'fees',
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
										status: 'active',
									},
								},
								{
									$lookup: {
										from: 'receipts',
										localField: 'depositReceiptId',
										foreignField: '_id',
										pipeline: [
											{
												$project: {
													amount: 1,
													paidAmount: 1,
													status: 1,
													createdAt: 1,
												},
											},
										],
										as: 'depositReceipt',
									},
								},
								{
									$lookup: {
										from: 'customers',
										localField: '_id',
										foreignField: 'contract',
										pipeline: [
											{
												$project: {
													_id: 1,
													fullName: 1,
													phone: 1,
													isContractOwner: 1,
												},
											},
										],
										as: 'customers',
									},
								},
								{
									$lookup: {
										from: 'vehicles',
										localField: 'customers._id',
										foreignField: 'owner',
										pipeline: [
											{
												$match: {
													$expr: {
														$in: ['$status', [vehicleStatus.ACTIVE, vehicleStatus.SUSPENDED]],
													},
												},
											},
											{
												$project: {
													licensePlate: 1,
													owner: 1,
													fromDate: 1,
													room: 1,
													status: 1,
												},
											},
										],
										as: 'vehicles',
									},
								},
								{
									$project: {
										depositReceipt: {
											$arrayElemAt: ['$depositReceipt', 0],
										},
										customers: 1,
										contractSignDate: 1,
										contractEndDate: 1,
										status: 1,
										contractTerm: 1,
										note: 1,
										rent: 1,
										depositAmount: 1,
										vehicles: 1,
										customerQuantity: { $size: '$customers' },
										vehicleQuantity: { $size: '$vehicles' },
									},
								},
							],
							as: 'contract',
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
										$expr: {
											$and: [
												{
													$not: {
														$in: ['$status', [invoiceStatus.TERMINATED, invoiceStatus.PENDING]],
													},
												},
												{
													$eq: ['$month', month],
												},
												{
													$eq: ['$year', year],
												},
											],
										},
									},
								},
								{
									$project: {
										total: 1,
										paidAmount: 1,
										status: 1,
										invoiceContent: 1,
									},
								},
							],
							as: 'invoices',
						},
					},
					{
						$lookup: {
							from: 'receipts',
							localField: '_id',
							foreignField: 'room',
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{
													$not: {
														$in: ['$status', [receiptStatus.TERMINATED, receiptStatus.PENDING]],
													},
												},
												{
													$eq: ['$month', month],
												},
												{
													$eq: ['$year', year],
												},
											],
										},
									},
								},
								{
									$project: {
										amount: 1,
										paidAmount: 1,
										status: 1,
										receiptContent: 1,
									},
								},
							],
							as: 'receipts',
						},
					},
					{
						$lookup: {
							from: 'debts',
							localField: '_id',
							foreignField: 'room',
							pipeline: [
								{
									$match: {
										$expr: {
											$in: ['$status', [debtStatus.PENDING]],
										},
									},
								},
								{
									$project: {
										amount: 1,
										room: 1,
										period: 1,
										status: 1,
										content: 1,
									},
								},
							],
							as: 'debts',
						},
					},
					{
						$project: {
							contract: {
								$ifNull: [
									{
										$arrayElemAt: ['$contract', 0],
									},
									null,
								],
							},
							roomIndex: 1,
							roomPrice: 1,
							roomState: 1,
							interior: 1,
							note: 1,
							invoices: 1,
							receipts: 1,
							fees: 1,
							debts: 1,
						},
					},
					{
						$sort: {
							roomIndex: 1,
						},
					},
				],
				as: 'rooms',
			},
		},
	];
};

module.exports = {
	getAllBillsPipeline,
	getStatisticGeneral,
	getFinanceSettlementData,
	getPrepareFinanceSettlementData,
	getAllInvoicesInPeriod,
	getExcelData,
};
