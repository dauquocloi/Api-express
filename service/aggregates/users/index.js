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
				pipeline: [
					{
						$project: {
							_id: 1,
							management: 1,
							buildingName: 1,
							buildingAddress: 1,
						},
					},
				],
				as: 'buildingInfo',
			},
		},
		{
			$addFields: {
				managementMappings: {
					$reduce: {
						input: '$buildingInfo',
						initialValue: [],
						in: {
							$concatArrays: [
								'$$value',
								{
									$map: {
										input: {
											$filter: {
												input: '$$this.management',
												as: 'm',
												cond: {
													$in: ['$$m.role', ['manager', 'staff']],
												},
											},
										},
										as: 'm',
										in: {
											userId: '$$m.user',
											buildingName: '$$this.buildingName',
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
			$addFields: {
				managementGrouped: {
					$map: {
						input: {
							$setUnion: [
								[],
								{
									$map: {
										input: '$managementMappings',
										as: 'm',
										in: '$$m.userId',
									},
								},
							],
						},
						as: 'userId',
						in: {
							userId: '$$userId',
							buildingManagement: {
								$map: {
									input: {
										$filter: {
											input: '$managementMappings',
											as: 'm',
											cond: {
												$eq: ['$$m.userId', '$$userId'],
											},
										},
									},
									as: 'bm',
									in: '$$bm.buildingName',
								},
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'users',
				let: {
					managers: '$managementGrouped',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: [
									'$_id',
									{
										$map: {
											input: '$$managers',
											as: 'm',
											in: '$$m.userId',
										},
									},
								],
							},
						},
					},
					{
						$addFields: {
							buildingManagement: {
								$let: {
									vars: {
										matched: {
											$first: {
												$filter: {
													input: '$$managers',
													as: 'm',
													cond: {
														$eq: ['$$m.userId', '$_id'],
													},
												},
											},
										},
									},
									in: '$$matched.buildingManagement',
								},
							},
						},
					},
					{
						$project: {
							password: 0,
							username: 0,
						},
					},
				],
				as: 'managements',
			},
		},
		{
			$project: {
				_id: 1,
				managements: 1,
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
