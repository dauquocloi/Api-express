const getAllCustomers = (buildingId, status) => {
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
			$unwind: {
				path: '$rooms',
			},
		},
		{
			$sort: {
				'rooms.roomIndex': 1,
			},
		},
		{
			$lookup: {
				from: 'customers',
				let: {
					roomId: '$rooms._id',
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
										$in: ['$status', status === 'leaved' ? [0] : [1, 2]],
									},
								],
							},
						},
					},
					{
						$project: {
							_id: 1,
							room: 1,
							fullName: 1,
							avatar: 1,
							phone: 1,
							isContractOwner: 1,
							gender: 1,
							birthday: 1,
							permanentAddress: 1,
							cccd: 1,
							cccdIssueDate: 1,
							cccdIssueAt: 1,
							status: 1,
							temporaryResidence: 1,
							checkinDate: 1,
							checkoutDate: {
								$cond: {
									if: { $eq: ['', 'leaved'] },
									then: '$checkoutDate',
									else: '$$REMOVE',
								},
							},
						},
					},
				],
				as: 'customers',
			},
		},
		{
			$group: {
				_id: '$_id',
				data: {
					$push: {
						roomId: '$rooms._id',
						roomIndex: '$rooms.roomIndex',
						roomState: '$rooms.roomState',
						customerInfo: '$customers',
					},
				},
			},
		},
	];
};

module.exports = { getAllCustomers };
