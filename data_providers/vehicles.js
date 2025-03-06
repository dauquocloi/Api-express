const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');

exports.getAll = (data, cb) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		let buildingId = mongoose.Types.ObjectId(`${data.id}`);
		Entity.BuildingsEntity.aggregate(
			[
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
						localField: 'customerInfo._id',
						foreignField: 'owner',
						as: 'vehicleInfo',
						pipeline: [
							{
								$match: {
									$expr: {
										$or: [
											{
												$eq: ['$status', 1],
											},
											{
												$eq: ['$status', 2],
											},
										],
									},
								},
							},
						],
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
						},
						data: {
							$map: {
								input: '$customerInfo',
								as: 'customer',
								in: {
									customerId: '$$customer._id',
									fullName: '$$customer.fullName',
									vehicleInfo: {
										$arrayElemAt: [
											{
												$filter: {
													input: '$vehicleInfo',
													as: 'vehicle',
													cond: {
														$eq: ['$$vehicle.owner', '$$customer._id'],
													},
												},
											},
											0,
										],
									},
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
								data: '$data',
							},
						},
					},
				},
			],
			cb,
		);
	} catch (error) {
		console.log('Lỗi lấy tất cả xe: ', error.message);
		cb(error, null);
	}
};
