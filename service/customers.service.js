const { NotFoundError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const Entity = require('../models');
const Pipelines = require('./aggregates');
const { CUSTOMER_STATUS } = require('../constants');

exports.findById = (customerId) => Entity.CustomersEntity.findById(customerId);

exports.findOwnerByContractId = (contractId) => Entity.CustomersEntity.findOne({ contract: contractId, isContractOwner: true });

exports.getContractOwner = (roomId) =>
	Entity.CustomersEntity.findOne({
		room: roomId,
		isContractOwner: true,
		status: { $in: [CUSTOMER_STATUS['ACTIVE'], CUSTOMER_STATUS['SUSPENDED']] },
	});

exports.findIsContractOwnerByRoomId = (roomId) =>
	Entity.CustomersEntity.findOne({
		room: roomId,
		status: { $in: [CUSTOMER_STATUS['ACTIVE'], CUSTOMER_STATUS['SUSPENDED']] },
		isContractOwner: true,
	});

exports.findByPhone = (phone) => Entity.CustomersEntity.findOne({ phone: phone });

exports.getAllCustomers = async (buildingObjectId, status) => {
	const [customerInfo] = await Entity.BuildingsEntity.aggregate(Pipelines.customers.getAllCustomers(buildingObjectId, status));
	return customerInfo.data ?? [];
};

exports.expiredCustomers = async ({ roomId, contractId }) => {
	const result = await Entity.CustomersEntity.updateMany(
		{ room: roomId, contract: contractId },
		{ $set: { status: CUSTOMER_STATUS['TERMINATED'] }, $inc: { version: 1 } },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy bản ghi');
	return result;
};

exports.importCustomers = async (customersData, session) => {
	const result = await Entity.CustomersEntity.insertMany(customersData, { session });
	return result;
};

exports.resetContractOwner = async (contractId, session) => {
	const result = await Entity.CustomersEntity.findOneAndUpdate(
		{ contract: contractId, isContractOwner: true },
		{ $set: { isContractOwner: false }, $inc: { version: 1 } },
		{ session },
	);
	if (!result) throw new NotFoundError('Dữ liệu không tồn tại');
	return result;
};

exports.setIsContractOwner = async (customerId, session) => {
	const result = await Entity.CustomersEntity.findOneAndUpdate(
		{ _id: customerId },
		{ $set: { isContractOwner: true }, $inc: { version: 1 } },
		{ session },
	);
	if (!result) throw new NotFoundError('Dữ liệu không tồn tại');
	return result;
};

exports.addCustomer = async (
	{ roomId, contractId, fullName, gender, birthdate, permanentAddress, phone, cccd, cccdIssueDate, cccdIssueAt },
	session,
) => {
	const result = await Entity.CustomersEntity.create(
		[
			{
				room: roomId,
				fullName: fullName,
				gender: gender,
				isContractOwner: false,
				birthdate: birthdate,
				permanentAddress: permanentAddress,
				phone: phone,
				cccd: cccd,
				cccdIssueDate: cccdIssueDate,
				cccdIssueAt: cccdIssueAt,
				status: CUSTOMER_STATUS['ACTIVE'],
				temporaryResidence: false,
				contract: contractId,
			},
		],
		{ session },
	);

	return result;
};

exports.setCustomerLeft = async (customerId, session) => {
	const result = await Entity.CustomersEntity.findOneAndUpdate(
		{ _id: customerId },
		{ $set: { status: CUSTOMER_STATUS['TERMINATED'] }, $inc: { version: 1 } },
		{ session },
	);
	if (!result) throw new NotFoundError('Dữ liệu không tồn tại');
	return result;
};
