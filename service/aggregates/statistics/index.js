const mongoose = require('mongoose');
// const getStatisticsPipeline = (buildingId, month, year) => {
// 	const prevMonth = month === 1 ? 12 : Number(month) - 1;
// 	const prevYear = month === 1 ? Number(year) - 1 : Number(year);

// 	return [
// 		{
// 			$match: {
// 				_id: buildingId,
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'rooms',
// 				localField: '_id',
// 				foreignField: 'building',
// 				as: 'listRooms',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'customers',
// 				localField: 'listRooms._id',
// 				foreignField: 'room',
// 				as: 'listCustomers',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'vehicles',
// 				localField: 'listRooms._id',
// 				foreignField: 'room',
// 				as: 'listVehicles',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'invoices',
// 				let: {
// 					roomIds: {
// 						$map: {
// 							input: '$listRooms',
// 							as: 'r',
// 							in: '$$r._id',
// 						},
// 					},
// 				},
// 				pipeline: [
// 					{
// 						$match: {
// 							$expr: {
// 								$and: [
// 									{
// 										$in: ['$room', '$$roomIds'],
// 									},
// 									{
// 										$eq: ['$year', year],
// 									},
// 									{
// 										$eq: ['$month', month],
// 									},
// 								],
// 							},
// 						},
// 					},
// 				],
// 				as: 'invoiceInfo',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'receipts',
// 				let: {
// 					roomIds: {
// 						$map: {
// 							input: '$listRooms',
// 							as: 'r',
// 							in: '$$r._id',
// 						},
// 					},
// 				},
// 				pipeline: [
// 					{
// 						$match: {
// 							$expr: {
// 								$and: [
// 									{
// 										$in: ['$room', '$$roomIds'],
// 									},
// 									{
// 										$eq: ['$year', year],
// 									},
// 									{
// 										$eq: ['$month', month],
// 									},
// 									{
// 										$ne: ['$status', 'terminated'],
// 									},
// 								],
// 							},
// 						},
// 					},
// 				],
// 				as: 'receiptInfo',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'transactions',
// 				let: {
// 					receiptIds: {
// 						$map: {
// 							input: '$receiptInfo',
// 							as: 'receipt',
// 							in: '$$receipt._id',
// 						},
// 					},
// 				},
// 				pipeline: [
// 					{
// 						$match: {
// 							$expr: {
// 								$and: [
// 									{
// 										$in: ['$receipt', '$$receiptIds'],
// 									},
// 									{
// 										$eq: ['$month', month],
// 									},
// 									{
// 										$eq: ['$year', year],
// 									},
// 								],
// 							},
// 						},
// 					},
// 				],
// 				as: 'transactionReceipt',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'incidentalRevenues',
// 				let: {
// 					buildingId: '$_id',
// 				},
// 				pipeline: [
// 					{
// 						$match: {
// 							$expr: {
// 								$and: [
// 									{
// 										$eq: ['$building', '$$buildingId'],
// 									},
// 									{
// 										$eq: ['$month', month],
// 									},
// 									{
// 										$eq: ['$year', year],
// 									},
// 								],
// 							},
// 						},
// 					},
// 				],
// 				as: 'incidentalRevenues',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'periodicExpenditures',
// 				localField: '_id',
// 				foreignField: 'building',
// 				as: 'periodicExpenditures',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'expenditures',
// 				let: {
// 					buildingId: '$_id',
// 				},
// 				pipeline: [
// 					{
// 						$match: {
// 							$expr: {
// 								$and: [
// 									{
// 										$eq: ['$building', '$$buildingId'],
// 									},
// 									{
// 										$eq: ['$month', month],
// 									},
// 									{
// 										$eq: ['$year', year],
// 									},
// 								],
// 							},
// 						},
// 					},
// 				],
// 				as: 'incidentalExpenditures',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'statistics',
// 				let: {
// 					buildingId: '$_id',
// 				},
// 				pipeline: [
// 					{
// 						$match: {
// 							$expr: {
// 								$and: [
// 									{
// 										$eq: ['$building', '$$buildingId'],
// 									},
// 									{
// 										$eq: ['$year', year],
// 									},
// 								],
// 							},
// 						},
// 					},
// 					{
// 						$sort: {
// 							month: 1,
// 						},
// 					},
// 				],
// 				as: 'recentStatistics',
// 			},
// 		},
// 		{
// 			$lookup: {
// 				from: 'statistics',
// 				let: {
// 					buildingId: '$_id',
// 				},
// 				pipeline: [
// 					{
// 						$match: {
// 							$expr: {
// 								$and: [
// 									{
// 										$eq: ['$building', '$$buildingId'],
// 									},
// 									{
// 										$eq: ['$month', prevMonth],
// 									},
// 									{
// 										$eq: ['$year', prevYear],
// 									},
// 								],
// 							},
// 						},
// 					},
// 					{
// 						$project: {
// 							_id: 1,
// 							month: 1,
// 							year: 1,
// 							profit: 1,
// 							roomOccupancyRate: '$room.occupancyRate',
// 							totalVehicle: '$vehicle.totalVehicle',
// 							totalCustomer: '$customer.totalCustomer',
// 						},
// 					},
// 				],
// 				as: 'preStatistics',
// 			},
// 		},
// 		{
// 			$addFields: {
// 				totalInvoice: {
// 					$sum: {
// 						$map: {
// 							input: '$invoiceInfo',
// 							as: 'invoice',
// 							in: '$$invoice.paidAmount',
// 						},
// 					},
// 				},
// 				totalReceipt: {
// 					$sum: {
// 						$map: {
// 							input: '$transactionReceipt',
// 							as: 'receipt',
// 							in: '$$receipt.amount',
// 						},
// 					},
// 				},
// 				totalIncidentalRevenue: {
// 					$sum: {
// 						$map: {
// 							input: '$incidentalRevenues',
// 							as: 'incidentalRevenue',
// 							in: '$$incidentalRevenue.amount',
// 						},
// 					},
// 				},
// 				totalPeriodicExpenditure: {
// 					$sum: {
// 						$map: {
// 							input: '$periodicExpenditures',
// 							as: 'periodicEx',
// 							in: '$$periodicEx.amount',
// 						},
// 					},
// 				},
// 				totalIncidentalExpenditure: {
// 					$sum: {
// 						$map: {
// 							input: '$incidentalExpenditures',
// 							as: 'incidentalEx',
// 							in: '$$incidentalEx.amount',
// 						},
// 					},
// 				},
// 				totalRoom: {
// 					$size: '$listRooms',
// 				},
// 				totalRoomStateHired: {
// 					$size: {
// 						$filter: {
// 							input: '$listRooms',
// 							as: 'room',
// 							cond: {
// 								$eq: ['$$room.roomState', 1], // 1 = hired
// 							},
// 						},
// 					},
// 				},
// 				totalRoomStateUnHired: {
// 					$size: {
// 						$filter: {
// 							input: '$listRooms',
// 							as: 'room',
// 							cond: {
// 								$or: [
// 									{
// 										$eq: ['$$room.roomState', 0],
// 									},
// 									{
// 										$eq: ['$$room.roomState', 2],
// 									},
// 								],
// 							},
// 						},
// 					},
// 				},
// 				totalCustomer: {
// 					$size: '$listCustomers',
// 				},
// 				customerTemporaryResidence: {
// 					$size: {
// 						$filter: {
// 							input: '$listCustomers',
// 							as: 'customer',
// 							cond: {
// 								$eq: ['$$customer.temporaryResidence', true],
// 							},
// 						},
// 					},
// 				},
// 				totalVehicle: {
// 					$size: '$listVehicles',
// 				},
// 				preStatistics: {
// 					$arrayElemAt: ['$preStatistics', 0],
// 				},
// 			},
// 		},
// 		{
// 			$project: {
// 				_id: 1,
// 				revenue: {
// 					$add: ['$totalInvoice', '$totalReceipt', '$totalIncidentalRevenue'],
// 				},
// 				expenditure: {
// 					$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
// 				},
// 				profit: {
// 					$subtract: [
// 						{
// 							$add: ['$totalInvoice', '$totalReceipt', '$totalIncidentalRevenue'],
// 						},
// 						{
// 							$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
// 						},
// 					],
// 				},
// 				profitComparisonRate: {
// 					$round: [
// 						{
// 							$multiply: [
// 								{
// 									$divide: [
// 										{
// 											$subtract: [
// 												{
// 													$subtract: [
// 														{
// 															$add: ['$totalInvoice', '$totalReceipt'],
// 														},
// 														{
// 															$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
// 														},
// 													],
// 												},
// 												'$preStatistics.profit',
// 											],
// 										},
// 										'$preStatistics.profit',
// 									],
// 								},
// 								100,
// 							],
// 						},
// 					],
// 				},
// 				room: {
// 					totalRoom: '$totalRoom',
// 					rentedRoom: '$totalRoomStateHired',
// 					emptyRoom: '$totalRoomStateUnHired',
// 					occupancyRate: {
// 						$round: [
// 							{
// 								$multiply: [
// 									{
// 										$divide: ['$totalRoomStateHired', '$totalRoom'],
// 									},
// 									100,
// 								],
// 							},
// 						],
// 					},
// 					occupancyComparisonRate: {
// 						$subtract: [
// 							{
// 								$round: [
// 									{
// 										$multiply: [
// 											{
// 												$divide: ['$totalRoomStateHired', '$totalRoom'],
// 											},
// 											100,
// 										],
// 									},
// 								],
// 							},
// 							'$preStatistics.roomOccupancyRate',
// 						],
// 					},
// 				},
// 				customer: {
// 					totalCustomer: '$totalCustomer',
// 					customerComparisonRate: {
// 						$round: [
// 							{
// 								$multiply: [
// 									{
// 										$divide: [
// 											{
// 												$subtract: ['$totalCustomer', '$preStatistics.totalCustomer'],
// 											},
// 											'$preStatistics.totalCustomer',
// 										],
// 									},
// 									100,
// 								],
// 							},
// 						],
// 					},
// 					temporaryResidentTotal: '$customerTemporaryResidence',
// 				},
// 				vehicle: {
// 					totalVehicle: '$totalVehicle',
// 					vehicleComparisonRate: {
// 						$round: [
// 							{
// 								$multiply: [
// 									{
// 										$divide: [
// 											{
// 												$subtract: ['$totalVehicle', '$preStatistics.totalVehicle'],
// 											},
// 											'$preStatistics.totalVehicle',
// 										],
// 									},
// 									100,
// 								],
// 							},
// 						],
// 					},
// 				},
// 				recentStatistics: 1,
// 			},
// 		},
// 		{
// 			$addFields: {
// 				recentStatistics: {
// 					$concatArrays: [
// 						{
// 							$ifNull: ['$recentStatistics', []],
// 						},
// 						[
// 							{
// 								_id: new mongoose.Types.ObjectId(),
// 								revenue: '$revenue',
// 								expenditure: '$expenditure',
// 								profit: '$profit',
// 								profitComparisonRate: '$profitComparisonRate',
// 								room: '$room',
// 								customer: '$customer',
// 								vehicle: '$vehicle',
// 								statisticStatus: 'unLock',
// 								month: month,
// 								year: year,
// 							},
// 						],
// 					],
// 				},
// 			},
// 		},
// 	];
// };

const getStatisticsPipelineModify = (buildingObjectId, month, year) => {
	const prevMonth = month === 1 ? 12 : Number(month) - 1;
	const prevYear = month === 1 ? Number(year) - 1 : Number(year);
	return [
		// Stage 1: Lọc building theo ID
		{
			$match: {
				_id: buildingObjectId,
			},
		},

		// Stage 2: Lookup tất cả rooms của building
		{
			$lookup: {
				from: 'rooms',
				localField: '_id',
				foreignField: 'building',
				as: 'listRooms',
			},
		},

		// Stage 3: Tạo biến roomIds để sử dụng cho các lookup sau
		{
			$addFields: {
				roomIds: {
					$map: {
						input: '$listRooms',
						as: 'room',
						in: '$$room._id',
					},
				},
			},
		},

		{
			$lookup: {
				from: 'contracts',
				localField: 'listRooms._id',
				foreignField: 'room',
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$status', 'active'],
							},
						},
					},
				],
				as: 'contracts',
			},
		},

		// Stage 4: Lookup customers
		{
			$lookup: {
				from: 'customers',
				localField: 'contracts._id',
				foreignField: 'contract',
				pipeline: [
					{
						$match: {
							$expr: {
								$ne: ['$status', 0],
							},
						},
					},
				],
				as: 'listCustomers',
			},
		},

		// Stage 5: Lookup vehicles
		{
			$lookup: {
				from: 'vehicles',
				localField: 'listCustomers._id',
				foreignField: 'owner',
				pipeline: [
					{
						$match: {
							$expr: {
								$ne: ['$status', 'terminated'],
							},
						},
					},
				],
				as: 'listVehicles',
			},
		},

		// Stage 6: Lookup invoices của tháng hiện tại (tháng 5/2025)
		{
			$lookup: {
				from: 'invoices',
				let: { roomIds: '$roomIds' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $in: ['$room', '$$roomIds'] },
									{ $eq: ['$year', year] },
									{ $eq: ['$month', month] },
									{
										$not: {
											$in: ['$status', ['terminated', 'pending']],
										},
									},
								],
							},
						},
					},
				],
				as: 'currentInvoices',
			},
		},

		// Stage 7: Lookup receipts của tháng hiện tại (không bao gồm terminated)
		{
			$lookup: {
				from: 'receipts',
				let: {
					roomIds: '$roomIds',
					month: month,
					year: year,
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$cond: [
									{
										$eq: ['$receiptType', 'deposit'],
									},
									//then
									{
										$and: [
											{
												$in: ['$room', '$$roomIds'],
											},
											{
												$lt: ['$carriedOverPaidAmount', '$amount'],
											},
										],
									},
									//else
									{
										$and: [
											{
												$in: ['$room', '$$roomIds'],
											},
											{
												$eq: ['$month', '$$month'],
											},
											{
												$eq: ['$year', '$$year'],
											},
											{
												$in: ['$status', ['paid', 'partial', 'unpaid']],
											},
										],
									},
								],
							},
						},
					},
				],
				as: 'currentReceipts',
			},
		},

		// Stage 8: Lookup transactions dựa trên receipts
		{
			$lookup: {
				from: 'transactions',
				let: {
					receiptIds: {
						$map: {
							input: '$currentReceipts',
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
									{ $eq: ['$month', month] },
									{ $eq: ['$year', year] },
								],
							},
						},
					},
				],
				as: 'currentTransactions',
			},
		},

		// Stage 9: Lookup incidental revenues của tháng hiện tại
		{
			$lookup: {
				from: 'incidentalRevenues',
				let: { buildingId: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$building', '$$buildingId'],
									},
									{ $eq: ['$month', month] },
									{ $eq: ['$year', year] },
								],
							},
						},
					},
				],
				as: 'currentIncidentalRevenues',
			},
		},

		// Stage 10: Lookup periodic expenditures (chi phí định kỳ)
		{
			$lookup: {
				from: 'periodicExpenditures',
				localField: '_id',
				foreignField: 'building',
				as: 'periodicExpenditures',
			},
		},

		// Stage 11: Lookup incidental expenditures của tháng hiện tại
		{
			$lookup: {
				from: 'expenditures',
				let: { buildingId: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$building', '$$buildingId'],
									},
									{ $eq: ['$month', month] },
									{ $eq: ['$year', year] },
								],
							},
						},
					},
				],
				as: 'currentIncidentalExpenditures',
			},
		},

		// Stage 12: Lookup statistics của tháng trước (tháng 4/2025)
		{
			$lookup: {
				from: 'statistics',
				let: { buildingId: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$building', '$$buildingId'],
									},
									{
										$eq: ['$month', prevMonth],
									},
									{
										$eq: ['$year', prevYear],
									},
								],
							},
						},
					},
				],
				as: 'previousStatistics',
			},
		},

		// Stage 13: Lookup tất cả statistics gần đây của năm 2025
		{
			$lookup: {
				from: 'statistics',
				let: { buildingId: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$building', '$$buildingId'],
									},
									{ $eq: ['$year', year] },
								],
							},
						},
					},
					{
						$sort: { month: 1 },
					},
				],
				as: 'recentStatistics',
			},
		},

		// Stage 14: Tính toán các giá trị thống kê
		{
			$addFields: {
				// Tính tổng các giá trị hiện tại
				//Tổng hóa đơn tiền nhà
				totalInvoice: {
					$sum: {
						$map: {
							input: '$currentInvoices',
							as: 'invoice',
							in: '$$invoice.paidAmount',
						},
					},
				},
				//Tổng hóa đơn phát sinh
				totalReceipt: {
					$sum: {
						$map: {
							input: '$currentTransactions',
							as: 'transaction',
							in: '$$transaction.amount',
						},
					},
				},
				//tổng khoản thu phát sinh trong tháng
				totalIncidentalRevenue: {
					$sum: {
						$map: {
							input: '$currentIncidentalRevenues',
							as: 'revenue',
							in: '$$revenue.amount',
						},
					},
				},
				//tổng khoản chi định kỳ trong tháng
				totalPeriodicExpenditure: {
					$sum: {
						$map: {
							input: '$periodicExpenditures',
							as: 'expenditure',
							in: '$$expenditure.amount',
						},
					},
				},
				//tổng khoản chi phát sinh trong tháng

				totalIncidentalExpenditure: {
					$sum: {
						$map: {
							input: '$currentIncidentalExpenditures',
							as: 'expenditure',
							in: '$$expenditure.amount',
						},
					},
				},

				// Tính các giá trị về phòng
				totalRoom: { $size: '$listRooms' },
				totalRoomHired: {
					$size: {
						$filter: {
							input: '$listRooms',
							as: 'room',
							cond: {
								$or: [{ $eq: ['$$room.roomState', 1] }, { $eq: ['$$room.roomState', 2] }],
							},
						},
					},
				},
				totalRoomEmpty: {
					$size: {
						$filter: {
							input: '$listRooms',
							as: 'room',
							cond: {
								$eq: ['$$room.roomState', 0],
							},
						},
					},
				},

				// Tính các giá trị về khách hàng
				totalCustomer: { $size: '$listCustomers' },
				totalTemporaryResidence: {
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

				// Tính các giá trị về phương tiện
				totalVehicle: { $size: '$listVehicles' },

				// Lấy statistics tháng trước
				prevStats: {
					$arrayElemAt: ['$previousStatistics', 0],
				},
			},
		},

		// Stage 15: Tính toán revenue, expenditure, profit
		{
			$addFields: {
				currentRevenue: {
					$add: ['$totalInvoice', '$totalReceipt', '$totalIncidentalRevenue'],
				},
				currentExpenditure: {
					$add: ['$totalPeriodicExpenditure', '$totalIncidentalExpenditure'],
				},
			},
		},

		// Stage 16: Tính profit và occupancy rate
		{
			$addFields: {
				currentProfit: {
					$subtract: ['$currentRevenue', '$currentExpenditure'],
				},
				currentOccupancyRate: {
					$cond: {
						if: { $gt: ['$totalRoom', 0] },
						then: {
							$round: [
								{
									$multiply: [
										{
											$divide: ['$totalRoomHired', '$totalRoom'],
										},
										100,
									],
								},
								2,
							],
						},
						else: 0,
					},
				},
			},
		},

		// Stage 17: Tính các comparison rates
		{
			$addFields: {
				// Revenue comparison rate
				revenueComparisonRate: {
					$cond: {
						if: {
							$and: [{ $ne: ['$prevStats', null] }, { $gt: ['$prevStats.revenue', 0] }],
						},
						then: {
							$round: [
								{
									$multiply: [
										{
											$divide: [
												{
													$subtract: ['$currentRevenue', '$prevStats.revenue'],
												},
												'$prevStats.revenue',
											],
										},
										100,
									],
								},
								2,
							],
						},
						else: null,
					},
				},

				// Expenditure comparison rate
				expenditureComparisonRate: {
					$cond: {
						if: {
							$and: [
								{ $ne: ['$prevStats', null] },
								{
									$gt: ['$prevStats.expenditure', 0],
								},
							],
						},
						then: {
							$round: [
								{
									$multiply: [
										{
											$divide: [
												{
													$subtract: ['$currentExpenditure', '$prevStats.expenditure'],
												},
												'$prevStats.expenditure',
											],
										},
										100,
									],
								},
								2,
							],
						},
						else: null,
					},
				},

				// Profit comparison rate
				profitComparisonRate: {
					$cond: {
						if: {
							$and: [{ $ne: ['$prevStats', null] }, { $ne: ['$prevStats.profit', 0] }],
						},
						then: {
							$round: [
								{
									$multiply: [
										{
											$divide: [
												{
													$subtract: ['$currentProfit', '$prevStats.profit'],
												},
												{
													$abs: '$prevStats.profit',
												},
											],
										},
										100,
									],
								},
								2,
							],
						},
						else: null,
					},
				},

				// Occupancy comparison rate
				occupancyComparisonRate: {
					$cond: {
						if: { $ne: ['$prevStats', null] },
						then: {
							$round: [
								{
									$subtract: [
										'$currentOccupancyRate',
										{
											$ifNull: ['$prevStats.room.occupancyRate', 0],
										},
									],
								},
								2,
							],
						},
						else: null,
					},
				},

				// Customer comparison rate
				customerComparisonRate: {
					$cond: {
						if: {
							$and: [
								{ $ne: ['$prevStats', null] },
								{
									$gt: ['$prevStats.customer.totalCustomer', 0],
								},
							],
						},
						then: {
							$round: [
								{
									$multiply: [
										{
											$divide: [
												{
													$subtract: ['$totalCustomer', '$prevStats.customer.totalCustomer'],
												},
												'$prevStats.customer.totalCustomer',
											],
										},
										100,
									],
								},
								2,
							],
						},
						else: null,
					},
				},

				// Vehicle comparison rate
				vehicleComparisonRate: {
					$cond: {
						if: {
							$and: [
								{ $ne: ['$prevStats', null] },
								{
									$gt: ['$prevStats.vehicle.totalVehicle', 0],
								},
							],
						},
						then: {
							$round: [
								{
									$multiply: [
										{
											$divide: [
												{
													$subtract: ['$totalVehicle', '$prevStats.vehicle.totalVehicle'],
												},
												'$prevStats.vehicle.totalVehicle',
											],
										},
										100,
									],
								},
								2,
							],
						},
						else: null,
					},
				},
			},
		},

		// Stage 18: Project kết quả cuối cùng theo đúng schema
		{
			$project: {
				_id: 1,
				building: '$_id',
				month: month,
				year: year,
				statisticsStatus: 'unLock',

				// Financial data
				revenue: '$currentRevenue',
				revenueComparisonRate: 1,
				expenditure: '$currentExpenditure',
				expenditureComparitionRate: '$expenditureComparisonRate',
				profit: '$currentProfit',
				profitComparisonRate: 1,

				// Room statistics
				room: {
					totalRoom: '$totalRoom',
					rentedRoom: '$totalRoomHired',
					emptyRoom: '$totalRoomEmpty',
					occupancyRate: '$currentOccupancyRate',
					occupancyComparisonRate: 1,
				},

				// Customer statistics
				customer: {
					totalCustomer: '$totalCustomer',
					temporaryResidentTotal: '$totalTemporaryResidence',
					customerComparisonRate: 1,
				},

				// Vehicle statistics
				vehicle: {
					totalVehicle: '$totalVehicle',
					vehicleComparisonRate: 1,
				},

				// Recent statistics (để hiển thị lịch sử)
				recentStatistics: {
					$concatArrays: [
						{ $ifNull: ['$recentStatistics', []] },
						[
							{
								_id: new mongoose.Types.ObjectId(), // _id này chỉ nhằm để chọn kỳ.
								building: '$_id',
								month: month,
								year: year,
								statisticsStatus: 'unLock',
								revenue: '$currentRevenue',
								revenueComparisonRate: '$revenueComparisonRate',
								expenditure: '$currentExpenditure',
								expenditureComparitionRate: '$expenditureComparisonRate',
								profit: '$currentProfit',
								profitComparisonRate: '$profitComparisonRate',
								room: {
									totalRoom: '$totalRoom',
									rentedRoom: '$totalRoomHired',
									emptyRoom: '$totalRoomEmpty',
									occupancyRate: '$currentOccupancyRate',
									occupancyComparisonRate: '$occupancyComparisonRate',
								},
								customer: {
									totalCustomer: '$totalCustomer',
									temporaryResidentTotal: '$totalTemporaryResidence',
									customerComparisonRate: '$customerComparisonRate',
								},
								vehicle: {
									totalVehicle: '$totalVehicle',
									vehicleComparisonRate: '$vehicleComparisonRate',
								},
							},
						],
					],
				},
			},
		},
	];
};

module.exports = { getStatisticsPipelineModify };
