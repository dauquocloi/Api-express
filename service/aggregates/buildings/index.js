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

module.exports = { getAllBillsPipeline, getStatisticGeneral, getFinanceSettlementData, getPrepareFinanceSettlementData };
