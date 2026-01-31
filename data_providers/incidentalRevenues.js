const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const formatFee = require('../utils/formatFee');
const { NotFoundError } = require('../AppError');
const redis = require('../config/redisClient');

exports.createIncidentalRevenue = async (amount, content, collector, date, buildingId, redisKey) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const newIncidentalRevenue = await Entity.IncidentalRevenuesEntity.create({
		building: buildingObjectId,
		month: currentPeriod?.currentMonth,
		year: currentPeriod?.currentYear,
		amount: amount,
		content: content,
		collector: collector,
		date: date,
	});

	await redis.set(redisKey, `SUCCESS:${JSON.stringify(newIncidentalRevenue)}`, 'EX', process.env.REDIS_EXP_SEC);
	return newIncidentalRevenue;
};

exports.modifyIncidentalRevenue = async (data, redisKey) => {
	const incidentalRevenue = await Entity.IncidentalRevenuesEntity.findOne({ _id: data.revenueId });
	if (incidentalRevenue == null) {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}
	Object.assign(incidentalRevenue, data);
	await incidentalRevenue.save();

	await redis.set(redisKey, `SUCCESS:${JSON.stringify(incidentalRevenue)}`, 'EX', process.env.REDIS_EXP_SEC);
	return incidentalRevenue;
};

exports.deleteIncidentalRevenue = async (data) => {
	const incidentalRevenueObjectId = new mongoose.Types.ObjectId(data.incidentalRevenueId);

	const incidentalRevenue = await Entity.IncidentalRevenuesEntity.deleteOne({ _id: incidentalRevenueObjectId });

	if (incidentalRevenue.deletedCount === 0) {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}

	return incidentalRevenue;
};
