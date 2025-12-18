const { AppError, NotFoundError } = require('../AppError');
const { errorCodes } = require('../constants/errorCodes');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.getContractOwner = async (roomId, session) => {
	const query = Entity.CustomersEntity.findOne({ room: roomId, isContractOwner: true, status: { $in: [1, 2] } });
	if (session) query.session(session);
	const result = await query.lean().exec();
	return result;
};

exports.getAllCustomers = async (buildingObjectId, status) => {
	const [customerInfo] = await Entity.BuildingsEntity.aggregate(Pipelines.customers.getAllCustomers(buildingObjectId, status));
	return customerInfo.data ?? [];
};
