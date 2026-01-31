const { NotFoundError } = require('../AppError');
const Entity = require('../models');
const Pipelines = require('./aggregates');

exports.findIncidentalRevenueById = (incidentalRevenueId) => Entity.IncidentalRevenuesEntity.findById(incidentalRevenueId);

exports.lockAllIncidentalRevenues = async (buildingId, month, year, session) => {
	const result = await Entity.IncidentalRevenuesEntity.updateMany(
		{ building: buildingId, month: month, year: year },
		{ $set: { locked: true }, $inc: { version: 1 } },
		{ session },
	);
	if (result.matchedCount === 0) throw new NotFoundError('Không tìm thấy dữ liệu khoản thu để cập nhật !');
	return result;
};
