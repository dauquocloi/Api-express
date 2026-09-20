const mongoose = require('mongoose');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const { NotFoundError, BadRequestError, ConflictError } = require('../AppError');
const Services = require('../service');

exports.createIncidentalRevenue = async (data) => {
	const { amount, content, collector, date, buildingId, userId } = data;
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	await Services.buildings.assertBuildingWritable({ buildingId, userId });

	const newIncidentalRevenue = await Services.revenues.createIncidentalRevenue({
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
	const { amount, content, incidentalRevenueId, collector, date, version, image, userId } = data;
	const incidentalRevenue = await Services.revenues.findIncidentalRevenueById(incidentalRevenueId).lean().exec();
	if (incidentalRevenue) throw new NotFoundError('Dữ liệu không tồn tại');
	if (incidentalRevenue.version !== version) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng tải lại trang !');
	if (incidentalRevenue.locked === true) throw new BadRequestError('Dữ liệu đã khóa, không thể cập nhật !');
	await Services.buildings.assertBuildingWritable({ buildingId: incidentalRevenue.building, userId });

	const updatedIncidentalRevenue = await Services.revenues.modifyIncidentalRevenue({
		incidentalRevenueId,
		amount,
		content,
		date,
		collector,
		version,
		image: image || null,
	});
	return updatedIncidentalRevenue;
};

exports.deleteIncidentalRevenue = async (data) => {
	const { incidentalRevenueId, version, userId } = data;

	const incidentalRevenue = await Services.revenues.findIncidentalRevenueById(incidentalRevenueId).lean().exec();
	if (!incidentalRevenue) throw new NotFoundError('Dữ liệu không tồn tại !');
	if (incidentalRevenue.locked === true) throw new BadRequestError('Dữ liệu đã khóa, không thể cập nhật !');
	if (incidentalRevenue.version !== version) throw new ConflictError('Dữ liệu đã bị thay đổi, vui lòng tải lại trang !');

	await Services.buildings.assertBuildingWritable({ buildingId: incidentalRevenue.building, userId });
	await Services.revenues.removeIncidentalRevenue({ incidentalRevenueId, version });

	return;
};
