// Should be refactored => to month/year
const getDepositsPipeline = (buildingId, month, year) => {
	return [
		{
			$match: {
				building: buildingId,
				status: {
					$ne: 'close',
				},
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
			$sort: {
				createdAt: -1,
				'roomInfo.roomIndex': 1,
			},
		},
		{
			$group: {
				_id: '$building',
				listDeposits: {
					$push: {
						roomId: '$room',
						depositAmount: '$depositAmount',
						status: '$status',
						roomIndex: {
							$getField: {
								field: 'roomIndex',
								input: {
									$arrayElemAt: ['$roomInfo', 0],
								},
							},
						},
						_id: '$_id',
					},
				},
			},
		},
	];
};

const getDepositDetail = (depositId) => {
	return [
		{
			$match: {
				_id: depositId,
			},
		},
		{
			$lookup: {
				from: 'receipts',
				localField: 'receipt',
				foreignField: '_id',
				as: 'receiptInfo',
			},
		},
		{
			$lookup: {
				from: 'transactions',
				localField: 'receiptInfo._id',
				foreignField: 'receipt',
				as: 'transactions',
			},
		},
		{
			$lookup: {
				from: 'users',
				let: {
					collectorId: {
						$map: {
							input: '$transactions',
							as: 'trans',
							in: '$$trans.collector',
						},
					},
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$_id', '$$collectorId'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							fullName: 1,
						},
					},
				],
				as: 'collectorInfo',
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
							roomIndex: 1,
						},
					},
				],
				as: 'roomInfo',
			},
		},
		{
			$lookup: {
				from: 'buildings',
				localField: 'building',
				foreignField: '_id',
				as: 'buildingInfo',
			},
		},
		{
			$addFields: {
				roomInfo: {
					$arrayElemAt: ['$roomInfo', 0],
				},
				buildingInfo: {
					$arrayElemAt: ['$buildingInfo', 0],
				},
				// Chỉ trả về một đối tượng receipt thỏa
				receiptInfo: {
					$arrayElemAt: [
						{
							$filter: {
								input: '$receiptInfo',
								as: 'receipt',
								cond: {
									$ne: ['$$receipt.status', 'cancelled'],
								},
							},
						},
						0,
					],
				},
				transactions: {
					$map: {
						input: '$transactions',
						as: 'tran',
						in: {
							$mergeObjects: [
								'$$tran',
								{
									collector: {
										$first: {
											$filter: {
												input: '$collectorInfo',
												as: 'cu',
												cond: {
													$eq: ['$$cu._id', '$$tran.collector'],
												},
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
		{
			$project: {
				_id: 1,
				status: 1,
				interiors: 1,
				fees: 1,
				transactions: 1,
				receiptInfo: 1,
				room: {
					_id: '$room',
					roomIndex: '$roomInfo.roomIndex',
					rent: '$rent',
					depositAmount: '$depositAmount',
					actualDepositAmount: '$actualDepositAmount',
					depositCompletionDate: '$depositCompletionDate',
					checkinDate: '$checkinDate',
					rentalTerm: '$rentalTerm',
				},
				building: {
					_id: '$buildingInfo._id',
					buildingName: '$buildingInfo.buildingName',
					buildingAddress: '$buildingInfo.buildingAddress',
				},
				customer: {
					$mergeObjects: [
						'$customer',
						{
							numberOfOccupants: '$numberOfOccupants',
						},
					],
				},
			},
		},
	];
};

module.exports = { getDepositsPipeline, getDepositDetail };
