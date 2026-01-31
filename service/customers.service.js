const { NotFoundError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.findById = (customerId) => Entity.CustomersEntity.findById(customerId);

exports.findOwnerByContractId = (contractId) => Entity.CustomersEntity.findOne({ contract: contractId, isContractOwner: true });

exports.getContractOwner = async (roomId, session) => {
	const query = Entity.CustomersEntity.findOne({ room: roomId, isContractOwner: true, status: { $in: [1, 2] } });
	if (session) query.session(session);
	const result = await query.lean().exec();
	return result;
};

exports.findIsContractOwnerByRoomId = (roomId) => {
	return Entity.CustomersEntity.findOne({ room: roomId, status: { $in: [1, 2] }, isContractOwner: true });
};

exports.findByPhone = (phone) => Entity.CustomersEntity.findOne({ phone: phone });

exports.getAllCustomers = async (buildingObjectId, status) => {
	const [customerInfo] = await Entity.BuildingsEntity.aggregate(Pipelines.customers.getAllCustomers(buildingObjectId, status));
	return customerInfo.data ?? [];
};

exports.expiredCustomers = async ({ roomId, contractId }, session) => {
	const result = await Entity.CustomersEntity.updateMany({ room: roomId, contract: contractId }, { $set: { status: 0 } }, { session });
	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy bản ghi');
	return result;
};

exports.importCustomers = async (customersData, session) => {
	const result = await Entity.CustomersEntity.insertMany(customersData, { session });
	return result;
};
