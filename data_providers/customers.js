const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');

exports.getAll = async (data, cb, next) => {
	try {
		let buildingId = mongoose.Types.ObjectId(`${data.buildingId}`);
		const db = MongoConnect.Connect(config.database.name);

		const customerInfo = await Entity.BuildingsEntity.aggregate([
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
					'roomInfo.roomState': 1,
					'customerInfo._id': 1,
					'customerInfo.fullName': 1,
					'customerInfo.phone': 1,
				},
			},
			{
				$group: {
					_id: '$_id',
					listCustomer: {
						$push: {
							roomId: '$roomInfo._id',
							roomIndex: '$roomInfo.roomIndex',
							roomState: '$roomInfo.roomState',
							customerInfo: '$customerInfo',
						},
					},
				},
			},
		]);

		if (customerInfo.length > 0) {
			cb(null, customerInfo[0].listCustomer);
		}
	} catch (error) {
		next(error);
	}
};

exports.getCustomerById = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const customerId = mongoose.Types.ObjectId(`${data.customerId}`);

		const customerInfo = await Entity.CustomersEntity.aggregate([
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
					status: 1,
					checkinDate: 1,
					temporaryResidence: 1,
					vehicleInfo: '$vehicleInfo.licensePlate',
				},
			},
		]);

		if (customerInfo.length > 0) {
			cb(null, customerInfo[0]);
		} else {
			throw new Error('Cannot find customer infomation !');
		}
	} catch (error) {
		next(error);
	}
};

exports.editCustomer = async (data, cb, next) => {
	try {
		let db = MongoConnect.Connect(config.database.name);
		let customerId = mongoose.Types.ObjectId(`${data.customerId}`);

		const customerInfo = await Entity.CustomersEntity.findById(customerId);
		if (!customerInfo) {
			next(new Error('Customer does not exist !'));
		}

		Object.assign(customerInfo, data); // Gán dữ liệu mới vào document

		const updatedCustomer = await customerInfo.save();

		cb(null, updatedCustomer);
	} catch (error) {
		next(error);
	}
};

exports.addCustomer = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const roomId = mongoose.Types.ObjectId(`${data.roomId}`);

		const encryptedPassword = await bcrypt.hash(data.phone, 5);

		const newUser = await Entity.UsersEntity.create({
			username: data.phone,
			password: encryptedPassword,
			role: 'customer',
		});
		const newCustomerInfo = {
			room: roomId,
			user: newUser._id,
			fullName: data.fullName,
			gender: data.gender,
			iscontractowner: data.iscontractowner,
			birthday: data.dayOfBirth,
			permanentAddress: data.permanentAddress,
			phone: data.phone,
			cccd: data.cccd,
			cccdIssueDate: data.cccdIssueDate,
			status: data.customerStatus,
			room: data.roomId,
			temporaryResidence: false,
		};

		const customer = await Entity.CustomersEntity.create(newCustomerInfo);

		cb(null, customer);
	} catch (error) {
		next(error);
	}
};

exports.setCustomerStatus = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const customerId = mongoose.Types.ObjectId(`${data.customerId}`);

		const customerRecent = await Entity.CustomersEntity.findOne({ _id: customerId });

		if (customerRecent != null) {
			customerRecent.status = data.status;
			const modifiedCustomer = await customerRecent.save();

			cb(null, modifiedCustomer);
		}

		throw new Error('Customer không tồn tại !');
	} catch (error) {
		next(error);
	}
};

exports.getContractOwnerByRoomId = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);
		const contractOwnerInfo = await Entity.CustomersEntity.findOne({ room: roomObjectId, status: { $in: [1, 2] }, isContractOwner: true });
		console.log('log of contractOwnerInfo: ', contractOwnerInfo);
		if (!contractOwnerInfo) {
			throw new Error(`Customer does not exist`);
		}
		cb(null, contractOwnerInfo);
	} catch (error) {
		next(error);
	}
};

exports.getCustomerLeaved = async (data, cb, next) => {
	try {
		const dbs = MongoConnect.Connect(config.database.name);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const getCustomerLeaved = await Entity.BuildingsEntity.aggregate([
			{
				$match: {
					_id: buildingObjectId,
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
											$eq: ['$status', 0],
										},
									],
								},
							},
						},
						{
							$project: {
								_id: 1,
								fullName: 1,
								checkoutDate: 1,
								avatar: 1,
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
		]);

		if (getCustomerLeaved.length === 0) {
			throw new Error(`Building ${data.buildingId} không tồn tại`);
		}

		cb(null, getCustomerLeaved[0].data);
	} catch (error) {
		next(error);
	}
};
