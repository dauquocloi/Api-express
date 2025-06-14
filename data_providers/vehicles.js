const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
const uploadImage = require('../utils/uploadImage');
const getFileUrl = require('../utils/getFileUrl');
var Entity = require('../models');

exports.getAll = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		let buildingId = mongoose.Types.ObjectId(`${data.id}`);

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

		if (data.status === 'active') {
			matchStage.$match.$expr.$and.push({
				$or: [{ $eq: ['$status', 'active'] }, { $eq: ['$status', 'suspended'] }],
			});
		} else if (data.status === 'terminated') {
			matchStage.$match.$expr.$and.push({
				$eq: ['$status', 'terminated'],
			});
		}

		const vehiclesData = await Entity.BuildingsEntity.aggregate([
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
												{},
											],
										},
									},
								},
							},
							as: 'item',
							cond: { $ne: ['$$item.vehicleInfo', {}] },
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
		]);
		if (vehiclesData.length > 0) {
			cb(null, vehiclesData[0].data);
		} else {
			throw new Error('Can not find vehicle infomation !');
		}
	} catch (error) {
		console.log('Lỗi lấy tất cả xe: ', error.message);
		next(error);
	}
};

exports.editVehicle = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const vehicleId = mongoose.Types.ObjectId(`${data.vehicleId}`);

		let vehicleRecent = await Entity.VehiclesEntity.findById(vehicleId);

		if (!vehicleRecent) {
			next(new Error('vehicle does not exits !'));
		}
		let vehicleImage;

		if (data.vehicleImage != undefined) {
			const handleUploadImage = await uploadImage(data.vehicleImage?.buffer);
			vehicleImage = handleUploadImage.Key;
		} else {
			vehicleImage = data.image;
		}

		const vehicle = {
			licensePlate: data.licensePlate,
			fromDate: data.fromDate,
			// owner: data.owner, // should be cannot modified !!!
			image: vehicleImage,
			status: data.status,
		};

		Object.assign(vehicleRecent, vehicle);

		const updatedVehicle = vehicleRecent.save();

		cb(null, updatedVehicle);
	} catch (error) {
		next(new Error(error.message));
	}
};

exports.addVehicle = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		let customerId = mongoose.Types.ObjectId(`${data.customerId}`);
		let roomId = mongoose.Types.ObjectId(`${data.room}`);

		const roomImage = await uploadImage(data.buffer);
		console.log(roomImage);

		const vehicle = {
			licensePlate: data.licensePlate,
			owner: customerId,
			room: roomId,
			fromDate: data.from,
			status: 1,
			image: roomImage.Key,
		};

		let vehicleCreated = await Entity.VehiclesEntity.create(vehicle);
		cb(null, vehicleCreated);
	} catch (error) {
		next(new Error(error.message));
	}
};

exports.getVehicle = async (data, cb, next) => {
	console.log(data);
	try {
		const db = MongoConnect.Connect(config.database.name);
		const vehicleId = mongoose.Types.ObjectId(`${data.vehicleId}`);

		const vehicle = await Entity.VehiclesEntity.aggregate([
			{
				$match: {
					_id: vehicleId,
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
		]);
		console.log('log of vehicleRecent: ', vehicle);

		if (vehicle[0].image != undefined || vehicle[0].image != null) {
			const url = await getFileUrl(vehicle[0].image);

			vehicle[0].url = url;
			console.log('log of vehicleInfo after vehicelRecent: ', vehicle);
		}

		cb(null, vehicle);
	} catch (error) {
		next(new Error(error.message));
	}
};
