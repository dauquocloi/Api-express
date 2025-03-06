const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');

exports.getAll = (data, cb) => {
	let buildingId = mongoose.Types.ObjectId(`${data.buildingId}`);
	MongoConnect.Connect(config.database.name).then((db) => {
		try {
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
						$project: {
							_id: 1,
							buildingName: 1,
							'roomInfo._id': 1,
							'roomInfo.roomIndex': 1,
							'customerInfo._id': 1,
							'customerInfo.fullName': 1,
							'customerInfo.phone': 1,
						},
					},
					{
						$group: {
							_id: '$_id',
							customer_RoomInfo: {
								$push: {
									roomId: '$roomInfo._id',
									roomIndex: '$roomInfo.roomIndex',
									customerInfo: '$customerInfo',
								},
							},
						},
					},
				],
				cb,
			);
		} catch (error) {
			console.log('Lỗi:', error.message);
		}
	});
};

exports.getById = (data, cb) => {
	// Kiểm tra tính hợp lệ của buildingId
	if (!mongoose.Types.ObjectId.isValid(data.customerId)) {
		return cb('objectId không hợp lệ', null);
	}
	let customerId;
	try {
		customerId = mongoose.Types.ObjectId(`${data.customerId}`);
	} catch (error) {
		console.log('Lỗi:', error.message);
	}

	MongoConnect.Connect(config.database.name).then((db) => {
		try {
			Entity.CustomersEntity.aggregate(
				[
					{
						$match: {
							_id: customerId,
						},
					},
					{
						$lookup: {
							from: 'vehicles',
							localField: '_id',
							foreignField: 'owner',
							as: 'vehicleInfo',
						},
					},
					{
						$unwind: {
							path: '$vehicleInfo',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$project: {
							_id: 1,
							isRenting: 1,
							fullName: 1,
							phone: 1,
							gender: 1,
							birthday: 1,
							cccd: 1,
							permanentAddress: 1,
							checkinDate: 1,
							vehicleInfo: '$vehicleInfo.licensePlate',
						},
					},
				],
				cb,
			);
		} catch (error) {
			console.error('Lỗi:', error.message);
		}
	});
};
