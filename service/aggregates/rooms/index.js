const getAllByBuildingPipeline = (buildingId) => {
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
				_id: buildingId,
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
								$and: [{ $eq: ['$building', '$$buildingId'] }, { $ne: ['$roomState', 0] }],
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
				_id: roomId,
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
										$eq: ['$status', 'active'],
									},
								],
							},
						},
					},
				],
				as: 'contractInfo',
			},
		},
		{
			$unwind: {
				path: '$contractInfo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'receipts',
				let: {
					receiptId: '$contractInfo.depositReceiptId',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$receiptId'],
							},
						},
					},
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
				foreignField: 'room',
				pipeline: [
					{
						$match: {
							status: { $ne: 0 },
						},
					},
				],
				as: 'customerInfo',
			},
		},
		{
			$lookup: {
				from: 'vehicles',
				localField: 'customerInfo._id',
				foreignField: 'owner',
				as: 'vehicleInfo',
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
										$eq: ['$status', 'pending'],
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
										$ne: ['$$roomState', 1],
									},
									{
										$eq: ['$room', '$$roomId'],
									},
									{
										$not: {
											$in: ['$status', ['cancelled', 'close']],
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
			$lookup: {
				from: 'depostiRefunds',
				let: {
					contractId: '$contractInfo._id',
					roomState: '$roomState',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $ne: ['$$roomState', 0] },
									{
										$eq: ['$contract', '$$contractId'],
									},
									{ $eq: ['$status', 'pending'] },
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							contract: 1,
							room: 1,
						},
					},
				],
				as: 'depositRefundInfo',
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
				feeInfo: 1,
				debtsInfo: 1,
				isRefundDeposit: 1,
				note: 1,
				contractInfo: {
					_id: '$contractInfo._id',
					rent: '$contractInfo.rent',
					contractSignDate: '$contractInfo.contractSignDate',
					contractEndDate: '$contractInfo.contractEndDate',
					expectedMoveOutDate: '$contractInfo.expectedMoveOutDate',
					isEarlyTermination: '$contractInfo.isEarlyTermination',
					contractTerm: '$contractInfo.contractTerm',
					contractCode: '$contractInfo.contractCode',
					status: '$contractInfo.status',
					contractPdfUrl: '$contractInfo.contractPdfUrl',
					depositId: '$contractInfo.depositId',
					depositReceiptInfo: {
						$first: '$depositReceipt',
					},
				},
				customerInfo: 1,
				vehicleInfo: 1,
				depositInfo: {
					$ifNull: [{ $first: '$deposit' }, null],
				},
				depositRefundInfo: {
					$ifNull: [{ $first: '$depositRefundInfo' }, null],
				},
			},
		},
	];
};

module.exports = {
	getAllByBuildingPipeline,
	listSelectingRoomPipeline,
	getRoomByIdPipeline,
};
