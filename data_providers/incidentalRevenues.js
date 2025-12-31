const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const formatFee = require('../utils/formatFee');
const { NotFoundError } = require('../AppError');
const Pipelines = require('../service/aggregates');

exports.createIncidentalRevenue = async (amount, content, collector, date, buildingId) => {
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

	return newIncidentalRevenue;
};

exports.modifyIncidentalRevenue = async (data) => {
	const incidentalRevenue = await Entity.IncidentalRevenuesEntity.findOne({ _id: data.revenueId });
	if (incidentalRevenue == null) {
		throw new NotFoundError('Dữ liệu không tồn tại');
	}
	Object.assign(incidentalRevenue, data);
	await incidentalRevenue.save();

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
