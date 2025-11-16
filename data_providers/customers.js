const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const bcrypt = require('bcrypt');
const AppError = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');

exports.getAll = async (data, cb, next) => {
	try {
		let buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

		const [customerInfo] = await Entity.BuildingsEntity.aggregate([
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
											$in: ['$status', data.status === 'leaved' ? [0] : [1, 2]],
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
		]);

		if (!customerInfo) throw new AppError(errorCodes.invariantViolation, `Dữ liệu không tồn tại`, 200);
		cb(null, customerInfo.data);
	} catch (error) {
		next(error);
	}
};

// remove this 08/11/2025
exports.getCustomerById = async (data, cb, next) => {
	try {
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
		const roomId = mongoose.Types.ObjectId(data.roomId);

		const newCustomerInfo = {
			room: roomId,
			fullName: data.fullName,
			gender: data.gender,
			isContractOwner: data?.isContractOwner ?? false,
			birthday: data.birthday,
			permanentAddress: data.permanentAddress,
			phone: data.phone,
			cccd: data.cccd,
			cccdIssueDate: data.cccdIssueDate,
			status: 1,
			temporaryResidence: false,
		};

		const customer = await Entity.CustomersEntity.create(newCustomerInfo);

		cb(null, {
			_id: customer._id,
			fullName: customer.fullName,
			avatar: customer.avatar,
			phone: customer.phone,
			roomId: customer.room,
		});
	} catch (error) {
		next(error);
	}
};

exports.setCustomerStatus = async (data, cb, next) => {
	try {
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

exports.getListSelectingCustomer = async (data, cb, next) => {
	try {
		const roomObjectId = mongoose.Types.ObjectId(data.roomId);

		const customersInfo = await Entity.CustomersEntity.find({ room: roomObjectId });
		// if(!customerInfo) throw new Error(`Không`)
		const customer = customersInfo.map((cus) => ({
			_id: cus._id,
			fullName: cus.fullName,
		}));

		cb(null, customer);
	} catch (error) {
		next(error);
	}
};
