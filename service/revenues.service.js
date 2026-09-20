const { NotFoundError, ConflictError } = require('../AppError');
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

exports.createIncidentalRevenue = async ({ building, month, year, amount, content, collector, date }) => {
	const result = await Entity.IncidentalRevenuesEntity.create({
		building,
		month,
		year,
		amount,
		content,
		collector,
		date,
	});
	return result;
};

exports.modifyIncidentalRevenue = async ({ incidentalRevenueId, version, content, amount, date, collector, image = null }) => {
	const updateQuery = {
		content,
		amount,
		date,
		collector,
	};
	if (!!image) updateQuery.image = image;

	const result = await Entity.IncidentalRevenuesEntity.findOneAndUpdate(
		{
			_id: incidentalRevenueId,
			version,
		},
		{
			$set: updateQuery,
			$inc: {
				version: 1,
			},
		},
		{
			new: true,
		},
	);

	if (!result) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng tải lại trang');
};

exports.removeIncidentalRevenue = async ({ incidentalRevenueId, version }) => {
	const result = await Entity.IncidentalRevenuesEntity.findOneAndDelete({ _id: incidentalRevenueId, version });
	if (!result) throw new ConflictError('Dữ liệu đã bị ai đó cập nhật, vui lòng tải lại trang.');
};
