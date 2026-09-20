const {
	invoiceStatus,
	receiptStatus,
	CUSTOMER_STATUS,
	roomState,
	depositStatus,
	debtStatus,
	vehicleStatus,
	contractStatus,
} = require('../../../constants');
const mongoose = require('mongoose');

const getAllByBuildingPipeline = (buildingId) => {
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
			$project: {
				_id: '$_id',
				roomId: '$roomInfo._id',
				roomIndex: '$roomInfo.roomIndex',
				roomPrice: '$roomInfo.roomPrice',
				roomState: '$roomInfo.roomState',
				isDeposited: '$roomInfo.isDeposited',
			},
		},

		{
			$group: {
				_id: '$_id',
				roomInfo: {
					$push: {
						_id: '$roomId',
						roomIndex: '$roomIndex',
						roomPrice: '$roomPrice',
						roomState: '$roomState',
						isDeposited: '$isDeposited',
					},
				},
			},
		},
	];
};

const listSelectingRoomPipeline = (buildingId) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(buildingId),
			},
		},
		{
			$lookup: {
				from: 'rooms',
				let: { buildingId: '$_id' },
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [{ $eq: ['$building', '$$buildingId'] }, { $ne: ['$roomState', roomState['UN_HIRED']] }],
							},
						},
					},
					{
						$project: {
							_id: 1,
							roomIndex: 1,
						},
					},
					{
						$sort: {
							roomIndex: 1,
						},
					},
				],
				as: 'listRooms',
			},
		},
	];
};

const getRoomByIdPipeline = (roomId) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(roomId),
			},
		},
		{
			$lookup: {
				from: 'fees',
				localField: '_id',
				foreignField: 'room',
				as: 'feeInfo',
			},
		},
		{
			$lookup: {
				from: 'contracts',
				let: {
					roomId: '$_id',
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
										$eq: ['$status', contractStatus['ACTIVE']],
									},
								],
							},
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
										_id: 1,
										amount: 1,
										paidAmount: 1,
										status: 1,
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
									$match: {
										$expr: {
											$in: ['$status', [CUSTOMER_STATUS['ACTIVE'], CUSTOMER_STATUS['SUSPENDED']]],
										},
									},
								},
								{
									$lookup: {
										from: 'vehicles',
										localField: '_id',
										foreignField: 'owner',
										pipeline: [
											{
												$match: {
													status: {
														$ne: vehicleStatus['TERMINATED'],
													},
												},
											},
										],
										as: 'vehicles',
									},
								},
							],
							as: 'customers',
						},
					},
					{
						$project: {
							_id: 1,
							version: 1,
							versions: {
								$filter: {
									input: '$versions',
									as: 'version',
									cond: {
										$eq: ['$status', contractStatus['ACTIVE']],
									},
								},
							},
							customers: 1,
							expectedMoveOutDate: 1,
							isEarlyTermination: 1,
							depositReceiptInfo: {
								$ifNull: [
									{
										$first: '$depositReceipt',
									},
									null,
								],
							},
						},
					},
				],
				as: 'contractInfo',
			},
		},
		{
			$set: {
				contractInfo: {
					$ifNull: [
						{
							$arrayElemAt: ['$contractInfo', 0],
						},
						null,
					],
				},
			},
		},

		{
			$lookup: {
				from: 'debts',
				let: {
					roomId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$status', debtStatus['PENDING']],
									},
									{
										$eq: ['$room', '$$roomId'],
									},
								],
							},
						},
					},
				],
				as: 'debtsInfo',
			},
		},
		{
			$lookup: {
				from: 'deposits',
				let: {
					roomId: '$_id',
					roomState: '$roomState',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$ne: ['$$roomState', roomState['HIRED']],
									},
									{
										$eq: ['$room', '$$roomId'],
									},
									{
										$not: {
											$in: ['$status', [depositStatus['CANCELLED'], depositStatus['CLOSED']]],
										},
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							checkinDate: 1,
							createdAt: 1,
						},
					},
				],
				as: 'deposit',
			},
		},
		{
			$project: {
				_id: 1,
				roomImage: 1,
				building: 1,
				roomIndex: 1,
				roomPrice: 1,
				interior: 1,
				roomState: 1,
				version: 1,
				feeInfo: 1,
				debtsInfo: 1,
				isRefundDeposit: 1,
				note: 1,
				contractInfo: 1,
				depositInfo: {
					$ifNull: [{ $first: '$deposit' }, null],
				},
			},
		},
	];
};

const getRoomHistoriesByRoomId = (roomObjectId) => {
	return [
		{
			$match: {
				room: new mongoose.Types.ObjectId(roomObjectId),
			},
		},
		{
			$lookup: {
				from: 'depositRefunds',
				localField: 'depositRefund',
				foreignField: '_id',
				as: 'depositRefund',
			},
		},
		{
			$lookup: {
				from: 'checkoutCosts',
				localField: 'checkoutCost',
				foreignField: '_id',
				as: 'checkoutCost',
			},
		},
		{
			$lookup: {
				from: 'contracts',
				localField: 'contract.contractId',
				foreignField: '_id',
				pipeline: [
					{
						$set: {
							versions: {
								$slice: [
									{
										$sortArray: {
											input: '$versions',
											sortBy: {
												version: -1,
											},
										},
									},
									1,
								],
							},
						},
					},
				],
				as: 'contract',
			},
		},
		{
			$addFields: {
				depositRefund: {
					$ifNull: [
						{
							$first: '$depositRefund',
						},
						null,
					],
				},
				checkoutCost: {
					$ifNull: [
						{
							$first: '$checkoutCost',
						},
						null,
					],
				},
				contract: {
					$ifNull: [
						{
							$first: '$contract',
						},
						null,
					],
				},
			},
		},
	];
};

const getRoomHistoryDetail = (roomHistoryObjectId) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(roomHistoryObjectId),
			},
		},
		{
			$lookup: {
				from: 'contracts',
				localField: 'contract.contractId',
				foreignField: '_id',
				pipeline: [
					{
						$lookup: {
							from: 'invoices',
							let: {
								contractId: '_id',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{
													$eq: ['$contract', '$$contractId'],
												},
												{
													$not: {
														$in: ['$status', [invoiceStatus['TERMINATED'], invoiceStatus['PENDING']]],
													},
												},
											],
										},
									},
								},
								{
									$sort: {
										month: 1,
										year: 1,
									},
								},
								{
									$project: {
										_id: 1,
										invoiceContent: 1,
										total: 1,
										paidAmount: 1,
										status: 1,
										month: 1,
										year: 1,
										createdAt: 1,
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
							foreignField: 'contract',
							pipeline: [
								{
									$match: {
										$expr: {
											$not: {
												$in: ['$status', [receiptStatus['TERMINATED'], receiptStatus['PENDING']]],
											},
										},
									},
								},
								{
									$sort: {
										month: 1,
										year: 1,
									},
								},
								{
									$project: {
										_id: 1,
										receiptContent: 1,
										amount: 1,
										paidAmount: 1,
										status: 1,
										createdAt: 1,
										month: 1,
										year: 1,
									},
								},
							],
							as: 'receipts',
						},
					},
					{
						$lookup: {
							from: 'customers',
							localField: '_id',
							foreignField: 'contract',
							as: 'customers',
						},
					},
				],
				as: 'contractInfo',
			},
		},
		{
			$set: {
				contractInfo: {
					$ifNull: [{ $first: '$contractInfo' }, null],
				},
			},
		},
	];
};

module.exports = {
	getAllByBuildingPipeline,
	listSelectingRoomPipeline,
	getRoomByIdPipeline,
	getRoomHistoriesByRoomId,
	getRoomHistoryDetail,
};
