const getAllManagements = (userObjectId) => {
	return [
		{
			$match: {
				_id: userObjectId,
			},
		},
		{
			$lookup: {
				from: 'buildings',
				localField: '_id',
				foreignField: 'management.user',
				as: 'buildingInfo',
			},
		},
		{
			$unwind: {
				path: '$buildingInfo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$unwind: {
				path: '$buildingInfo.management',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'users',
				let: {
					managements: '$buildingInfo.management',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$in: ['$role', ['manager', 'staff']],
									},
									{
										$eq: ['$$managements.user', '$_id'],
									},
								],
							},
						},
					},
				],
				as: 'managerInfo',
			},
		},
		{
			$unwind: {
				path: '$managerInfo',
			},
		},
		{
			$project: {
				_id: 1,
				phone: 1,
				fullName: 1,
				role: 1,
				buildingName: '$buildingInfo.buildingName',
				managerInfo: 1,
			},
		},
		{
			$group: {
				_id: {
					ownerId: '$_id',
					_id: '$managerInfo._id',
					avatar: '$managerInfo.avatar',
					expoPushToken: '$managerInfo.expoPushToken',
					phone: '$managerInfo.phone',
					role: '$managerInfo.role',
					birthdate: '$managerInfo.birthdate',
					cccd: '$managerInfo.cccd',
					cccdIssueDate: '$managerInfo.cccdIssueDate',
					fullName: '$managerInfo.fullName',
					permanentAddress: '$managerInfo.permanentAddress',
				},
				buildingManagement: {
					$push: '$buildingName',
				},
			},
		},
		{
			$group: {
				_id: '$_id.ownerId',
				managerInfo: {
					$push: {
						_id: '$_id._id',
						avatar: '$_id.avatar',
						expoPushToken: '$_id.expoPushToken',
						phone: '$_id.phone',
						role: '$_id.role',
						birthdate: '$_id.birthdate',
						cccd: '$_id.cccd',
						cccdIssueDate: '$_id.cccdIssueDate',
						fullName: '$_id.fullName',
						permanentAddress: '$_id.permanentAddress',
						buildingManagement: '$buildingManagement',
					},
				},
			},
		},
	];
};

const getListSelectionManagements = (userObjectId) => {
	return [
		{
			$match: {
				'management.user': userObjectId,
			},
		},
		{
			$addFields: {
				userQueryId: userObjectId,
			},
		},
		{
			$unwind: {
				path: '$management',
			},
		},
		{
			$group: {
				_id: '$userQueryId',
				listManagementObjectIds: {
					$addToSet: '$management.user',
				},
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: 'listManagementObjectIds',
				foreignField: '_id',
				pipeline: [
					{
						$project: {
							_id: 1,
							fullName: 1,
							role: 1,
							avatar: 1,
						},
					},
				],
				as: 'listManagements',
			},
		},
	];
};

module.exports = { getAllManagements, getListSelectionManagements };
