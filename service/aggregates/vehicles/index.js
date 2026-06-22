const mongoose = require('mongoose');
const { vehicleStatus } = require('../../../constants/vehicle');

const getAllVehicles = (buildingObjectId, status) => {
	console.log('Log of status from getAllVehicles: ', status);
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(buildingObjectId),
			},
		},
		{
			$lookup: {
				from: 'rooms',
				let: {
					buildingId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$$buildingId', '$building'],
							},
						},
					},
					{
						$lookup: {
							from: 'customers',
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
													$ne: ['$$roomState', 0],
												},
												{
													$eq: ['$$roomId', '$room'],
												},
												{
													$in: ['$status', [1, 2]],
												},
											],
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
														$in:
															status === vehicleStatus['ACTIVE']
																? [vehicleStatus['ACTIVE'], vehicleStatus['SUSPENDED']]
																: [vehicleStatus['TERMINATED']],
													},
												},
											},
										],
										as: 'vehicles',
									},
								},
								{
									$match: {
										'vehicles.0': {
											$exists: true,
										},
									},
								},
								{
									$project: {
										_id: 0,
										customerId: '$_id',
										status: 1,
										fullName: 1,
										vehicles: 1,
									},
								},
							],
							as: 'customers',
						},
					},
					{
						$project: {
							_id: 0,
							roomId: '$_id',
							roomIndex: 1,
							roomState: 1,
							data: '$customers',
						},
					},
					{
						$sort: {
							roomIndex: 1,
						},
					},
				],
				as: 'rooms',
			},
		},
		{
			$project: {
				_id: 1,
				rooms: 1,
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
