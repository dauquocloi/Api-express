const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const { AppError, NotFoundError } = require('../AppError');
const Services = require('../service');

// remove this 08/11/2025
// exports.getCustomerById = async (data, cb, next) => {
// 	try {
// 		const customerId = mongoose.Types.ObjectId(`${data.customerId}`);

// 		const customerInfo = await Entity.CustomersEntity.aggregate([
// 			{
// 				$match: {
// 					_id: customerId,
// 				},
// 			},
// 			{
// 				$lookup: {
// 					from: 'vehicles',
// 					localField: '_id',
// 					foreignField: 'owner',
// 					as: 'vehicleInfo',
// 				},
// 			},
// 			{
// 				$unwind: {
// 					path: '$vehicleInfo',
// 					preserveNullAndEmptyArrays: true,
// 				},
// 			},
// 			{
// 				$project: {
// 					_id: 1,
// 					isRenting: 1,
// 					fullName: 1,
// 					phone: 1,
// 					gender: 1,
// 					birthday: 1,
// 					cccd: 1,
// 					permanentAddress: 1,
// 					status: 1,
// 					checkinDate: 1,
// 					temporaryResidence: 1,
// 					vehicleInfo: '$vehicleInfo.licensePlate',
// 				},
// 			},
// 		]);

// 		if (customerInfo.length > 0) {
// 			cb(null, customerInfo[0]);
// 		} else {
// 			throw new Error('Cannot find customer infomation !');
// 		}
// 	} catch (error) {
// 		next(error);
// 	}
// };

exports.editCustomer = async (data) => {
	let customerId = mongoose.Types.ObjectId(`${data.customerId}`);

	const customerInfo = await Entity.CustomersEntity.findById(customerId);
	if (!customerInfo) {
		throw new NotFoundError('Khách hàng không tồn tại');
	}

	Object.assign(customerInfo, data); // Gán dữ liệu mới vào document

	const updatedCustomer = await customerInfo.save();

	return updatedCustomer;
};

exports.addCustomer = async (data) => {
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
		cccdIssueAt: data.cccdIssueAt,
		status: 1,
		temporaryResidence: false,
	};

	const customer = await Entity.CustomersEntity.create(newCustomerInfo);

	return {
		_id: customer._id,
		fullName: customer.fullName,
		avatar: customer.avatar,
		phone: customer.phone,
		roomId: customer.room,
	};
};

exports.setCustomerStatus = async (customerId, status) => {
	const customerRecent = await Entity.CustomersEntity.findOne({ _id: customerId });
	if (customerRecent != null) {
		customerRecent.status = status;
		const modifiedCustomer = await customerRecent.save();
		return 'Success';
	}
	throw new NotFoundError('Khách không tồn tại !');
};

exports.getListSelectingCustomer = async (roomId) => {
	const customersInfo = await Entity.CustomersEntity.find({ room: roomId, status: { $in: [1, 2] } });
	const customers = customersInfo.map((cus) => ({
		_id: cus._id,
		fullName: cus.fullName,
	}));
	return customers;
};

exports.getAllCustomers = async (buildingId, status) => {
	const buildingObjectId = mongoose.Types.ObjectId(buildingId);
	const customers = await Services.customers.getAllCustomers(buildingObjectId, status);
	return customers;
};
