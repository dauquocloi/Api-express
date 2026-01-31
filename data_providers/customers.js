const mongoose = require('mongoose');
const Entity = require('../models');
const { NotFoundError } = require('../AppError');
const Services = require('../service');
const redis = require('../config/redisClient');

exports.editCustomer = async (data, redisKey) => {
	let customerId = new mongoose.Types.ObjectId(`${data.customerId}`);

	const customerInfo = await Entity.CustomersEntity.findById(customerId);
	if (!customerInfo) {
		throw new NotFoundError('Khách hàng không tồn tại');
	}

	Object.assign(customerInfo, data); // Gán dữ liệu mới vào document

	const updatedCustomer = await customerInfo.save();

	await redis.set(redisKey, `SUCCESS:${updatedCustomer}`, 'EX', process.env.REDIS_EXP_SEC);
	return updatedCustomer;
};

exports.addCustomer = async (data, redisKey) => {
	const roomId = new mongoose.Types.ObjectId(data.roomId);

	const newCustomerInfo = {
		room: roomId,
		fullName: data.fullName,
		gender: data.gender,
		isContractOwner: data?.isContractOwner ?? false,
		birthdate: data.birthdate,
		permanentAddress: data.permanentAddress,
		phone: data.phone,
		cccd: data.cccd,
		cccdIssueDate: data.cccdIssueDate,
		cccdIssueAt: data.cccdIssueAt,
		status: 1,
		temporaryResidence: false,
	};

	const customer = await Entity.CustomersEntity.create(newCustomerInfo);

	const result = {
		_id: customer._id,
		fullName: customer.fullName,
		avatar: customer.avatar,
		phone: customer.phone,
		roomId: customer.room,
	};
	await redis.set(redisKey, `SUCCESS:${result}`, 'EX', process.env.REDIS_EXP_SEC);

	return result;
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
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const customers = await Services.customers.getAllCustomers(buildingObjectId, status);
	return customers;
};
