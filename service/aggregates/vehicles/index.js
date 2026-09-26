const mongoose = require('mongoose');
const { vehicleStatus, roomState, CUSTOMER_STATUS } = require('../../../constants');

const getAllVehicles = (buildingObjectId) => {
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
													$ne: ['$$roomState', roomState['UN_HIRED']],
												},
												{
													$eq: ['$$roomId', '$room'],
												},
												{
													$in: ['$status', [CUSTOMER_STATUS['ACTIVE'], CUSTOMER_STATUS['SUSPENDED']]],
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
														$in: [vehicleStatus['ACTIVE'], vehicleStatus['SUSPENDED']],
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

const getAllTerminatedVehicles = (buildingId) => {
	return [
		{
			$match: {
				_id: new mongoose.Types.ObjectId(buildingId),
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
							from: 'vehicles',
							localField: '_id',
							foreignField: 'room',
							pipeline: [
								{
									$match: {
										status: vehicleStatus['TERMINATED'],
									},
								},
								{
									$lookup: {
										from: 'customers',
										localField: 'owner',
										foreignField: '_id',
										pipeline: [
											{
												$project: {
													_id: 1,
													fullName: 1,
												},
											},
										],
										as: 'owner',
									},
								},
								{
									$set: {
										owner: {
											$ifNull: [{ $first: '$owner' }, null],
										},
									},
								},
							],
							as: 'vehicles',
						},
					},
					{
						$project: {
							_id: 0,
							roomId: '$_id',
							roomIndex: 1,
							roomState: 1,
							data: '$vehicles',
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
				version: 1,
				ownerInfo: {
					_id: '$ownerInfo._id',
					fullName: '$ownerInfo.fullName',
					status: '$ownerInfo.status',
				},
			},
		},
	];
};

module.exports = { getAllVehicles, getVehicleDetail, getAllTerminatedVehicles };
