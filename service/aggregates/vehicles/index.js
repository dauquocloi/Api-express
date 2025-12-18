const { vehicleStatus } = require('../../../constants/vehicle');

const getAllVehicles = (buildingId, status) => {
	const matchStage = {
		$match: {
			$expr: {
				$and: [
					{
						$in: ['$owner', '$$customerId'],
					},
				],
			},
		},
	};

	if (status === vehicleStatus['ACTIVE']) {
		matchStage.$match.$expr.$and.push({
			$or: [{ $eq: ['$status', 'active'] }, { $eq: ['$status', 'suspended'] }],
		});
	} else if (status === vehicleStatus['TERMINATED']) {
		matchStage.$match.$expr.$and.push({
			$eq: ['$status', 'terminated'],
		});
	}
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
				pipeline: [
					{
						$sort: {
							roomIndex: 1,
						},
					},
				],
				as: 'roomInfo',
			},
		},
		{
			$unwind: {
				path: '$roomInfo',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'roomInfo._id',
				foreignField: 'room',
				as: 'customerInfo',
			},
		},

		{
			$lookup: {
				from: 'vehicles',
				let: {
					customerId: {
						$map: {
							input: '$customerInfo',
							as: 'customer',
							in: '$$customer._id',
						},
					},
				},
				pipeline: [matchStage],
				as: 'vehicleInfo',
			},
		},
		{
			$project: {
				_id: {
					_id: '$_id',
					buildingName: '$buildingName',
				},
				roomInfo: {
					_id: '$roomInfo._id',
					roomIndex: '$roomInfo.roomIndex',
					roomState: '$roomInfo.roomState',
				},
				data: {
					$filter: {
						input: {
							$map: {
								input: '$customerInfo',
								as: 'customer',
								in: {
									customerId: '$$customer._id',
									fullName: '$$customer.fullName',
									vehicleInfo: {
										$ifNull: [
											{
												$filter: {
													input: '$vehicleInfo',
													as: 'vehicle',
													cond: {
														$eq: ['$$vehicle.owner', '$$customer._id'],
													},
												},
											},
											{},
										],
									},
								},
							},
						},
						as: 'item',
						cond: {
							$gt: [{ $size: '$$item.vehicleInfo' }, 0],
						},
					},
				},
			},
		},
		{
			$group: {
				_id: '$_id',
				data: {
					$push: {
						roomId: '$roomInfo._id',
						roomIndex: '$roomInfo.roomIndex',
						roomState: '$roomInfo.roomState',
						data: '$data',
					},
				},
			},
		},
	];
};

const getVehicleDetail = (vehicleObjectId) => {
	return [
		{
			$match: {
				_id: vehicleObjectId,
			},
		},
		{
			$lookup: {
				from: 'customers',
				localField: 'owner',
				foreignField: '_id',
				as: 'ownerInfo',
			},
		},
		{
			$unwind: {
				path: '$ownerInfo',
			},
		},
		{
			$project: {
				_id: 1,
				status: 1,
				owner: 1,
				room: 1,
				licensePlate: 1,
				fromDate: 1,
				image: 1,
				ownerInfo: {
					_id: '$ownerInfo._id',
					fullName: '$ownerInfo.fullName',
					status: '$ownerInfo.status',
				},
			},
		},
	];
};

module.exports = { getAllVehicles, getVehicleDetail };
