const mongoose = require('mongoose');
const getStatisticsPipeline = (buildingId, month, year) => {
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
				as: 'listRooms',
			},
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'listRooms._id',
				foreignField: 'room',
				as: 'listCustomers',
			},
		},
		{
			$lookup: {
				from: 'vehicles',
				localField: 'listRooms._id',
				foreignField: 'room',
				as: 'listVehicles',
			},
		},
		{
			$lookup: {
				from: 'invoices',
				let: {
					roomIds: {
						$map: {
							input: '$listRooms',
							as: 'r',
							in: '$$r._id',
						},
					},
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
										$eq: ['$year', year],
									},
									{
										$eq: ['$month', month],
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
				from: 'receipts',
				let: {
					roomIds: {
						$map: {
							input: '$listRooms',
							as: 'r',
							in: '$$r._id',
						},
					},
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
										$eq: ['$year', year],
									},
									{
										$eq: ['$month', month],
									},
									{
										$ne: ['$status', 'terminated'],
									},
								],
							},
						},
					},
				],
				as: 'receiptInfo',
			},
		},
		{
			$lookup: {
				from: 'transactions',
				let: {
					receiptIds: {
						$map: {
							input: '$receiptInfo',
							as: 'receipt',
							in: '$$receipt._id',
						},
					},
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$receipt', '$$receiptIds'],
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
				],
				as: 'transactionReceipt',
			},
		},
		{
			$lookup: {
				from: 'incidentalRevenues',
				let: {
					buildingId: '$_id',
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
										$eq: ['$month', month],
									},
									{
										$eq: ['$year', year],
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
				from: 'periodicExpenditures',
				localField: '_id',
				foreignField: 'building',
				as: 'periodicExpenditures',
			},
		},
		{
			$lookup: {
				from: 'expenditures',
				let: {
					buildingId: '$_id',
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
										$eq: ['$month', month],
									},
									{
										$eq: ['$year', year],
									},
								],
							},
						},
					},
				],
				as: 'incidentalExpenditures',
			},
		},
		{
			$lookup: {
				from: 'statistics',
				let: {
					buildingId: '$_id',
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
										$eq: ['$year', year],
									},
								],
							},
						},
					},
					{
						$sort: {
							month: 1,
						},
					},
				],
				as: 'recentStatistics',
			},
		},
		{
			$lookup: {
				from: 'statistics',
				let: {
					buildingId: '$_id',
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
										$eq: ['$month', month === 1 ? 12 : month - 1],
									},
									{
										$eq: ['$year', month === 1 ? year - 1 : year],
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
							profit: 1,
							roomOccupancyRate: '$room.occupancyRate',
							totalVehicle: '$vehicle.totalVehicle',
							totalCustomer: '$customer.totalCustomer',
						},
					},
				],
				as: 'preStatistics',
			},
		},
		{
			$addFields: {
				totalInvoice: {
					$sum: {
						$map: {
							input: '$invoiceInfo',
							as: 'invoice',
							in: '$$invoice.paidAmount',
						},
					},
				},
				totalReceipt: {
					$sum: {
						$map: {
							input: '$transactionReceipt',
							as: 'receipt',
							in: '$$receipt.amount',
						},
					},
				},
				totalIncidentalRevenue: {
					$sum: {
						$map: {
							input: '$incidentalRevenues',
							as: 'incidentalRevenue',
							in: '$$incidentalRevenue.amount',
						},
					},
				},
				totalPeriodicExpenditure: {
					$sum: {
						$map: {
							input: '$periodicExpenditures',
							as: 'periodicEx',
							in: '$$periodicEx.amount',
						},
					},
				},
				totalIncidentalExpenditure: {
					$sum: {
						$map: {
							input: '$incidentalExpenditures',
							as: 'incidentalEx',
							in: '$$incidentalEx.amount',
						},
					},
				},
				totalRoom: {
					$size: '$listRooms',
				},
				totalRoomStateHired: {
					$size: {
						$filter: {
							input: '$listRooms',
							as: 'room',
							cond: {
								$eq: ['$$room.roomState', 1], // 1 = hired
							},
						},
					},
				},
				totalRoomStateUnHired: {
					$size: {
						$filter: {
							input: '$listRooms',
							as: 'room',
							cond: {
								$or: [
									{
										$eq: ['$$room.roomState', 0],
									},
									{
										$eq: ['$$room.roomState', 2],
									},
								],
							},
						},
					},
				},
				totalCustomer: {
					$size: '$listCustomers',
				},
				customerTemporaryResidence: {
					$size: {
						$filter: {
							input: '$listCustomers',
							as: 'customer',
							cond: {
								$eq: ['$$customer.temporaryResidence', true],
							},
						},
					},
				},
				totalVehicle: {
					$size: '$listVehicles',
				},
				preStatistics: {
					$arrayElemAt: ['$preStatistics', 0],
				},
			},
		},
		{
			$project: {
				_id: 1,
				revenue: {
					$add: ['$totalInvoice', '$totalReceipt', '$totalIncidentalRevenue'],
				},
				expenditure: {
					$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
				},
				profit: {
					$subtract: [
						{
							$add: ['$totalInvoice', '$totalReceipt', '$totalIncidentalRevenue'],
						},
						{
							$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
						},
					],
				},
				profitComparisonRate: {
					$round: [
						{
							$multiply: [
								{
									$divide: [
										{
											$subtract: [
												{
													$subtract: [
														{
															$add: ['$totalInvoice', '$totalReceipt'],
														},
														{
															$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
														},
													],
												},
												'$preStatistics.profit',
											],
										},
										'$preStatistics.profit',
									],
								},
								100,
							],
						},
					],
				},
				room: {
					totalRoom: '$totalRoom',
					rentedRoom: '$totalRoomStateHired',
					emptyRoom: '$totalRoomStateUnHired',
					occupancyRate: {
						$round: [
							{
								$multiply: [
									{
										$divide: ['$totalRoomStateHired', '$totalRoom'],
									},
									100,
								],
							},
						],
					},
					occupancyComparisonRate: {
						$subtract: [
							{
								$round: [
									{
										$multiply: [
											{
												$divide: ['$totalRoomStateHired', '$totalRoom'],
											},
											100,
										],
									},
								],
							},
							'$preStatistics.roomOccupancyRate',
						],
					},
				},
				customer: {
					totalCustomer: '$totalCustomer',
					customerComparisonRate: {
						$round: [
							{
								$multiply: [
									{
										$divide: [
											{
												$subtract: ['$totalCustomer', '$preStatistics.totalCustomer'],
											},
											'$preStatistics.totalCustomer',
										],
									},
									100,
								],
							},
						],
					},
					temporaryResidentTotal: '$customerTemporaryResidence',
				},
				vehicle: {
					totalVehicle: '$totalVehicle',
					vehicleComparisonRate: {
						$round: [
							{
								$multiply: [
									{
										$divide: [
											{
												$subtract: ['$totalVehicle', '$preStatistics.totalVehicle'],
											},
											'$preStatistics.totalVehicle',
										],
									},
									100,
								],
							},
						],
					},
				},
				recentStatistics: 1,
			},
		},
		{
			$addFields: {
				recentStatistics: {
					$concatArrays: [
						{
							$ifNull: ['$recentStatistics', []],
						},
						[
							{
								_id: new mongoose.Types.ObjectId(),
								revenue: '$revenue',
								expenditure: '$expenditure',
								profit: '$profit',
								profitComparisonRate: '$profitComparisonRate',
								room: '$room',
								customer: '$customer',
								vehicle: '$vehicle',
								statisticStatus: 'unLock',
								month: month,
								year: year,
							},
						],
					],
				},
			},
		},
	];
};

module.exports = { getStatisticsPipeline };
