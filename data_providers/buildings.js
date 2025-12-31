const mongoose = require('mongoose');
let Entity = require('../models');
const bcrypt = require('bcrypt');
const { result } = require('underscore');
var XLSX = require('xlsx');
const uploadFile = require('../utils/uploadFile');
const withSignedUrls = require('../utils/withSignedUrls');
const Services = require('../service');
const Pipelines = require('../service/aggregates');
const { BadRequestError, NotFoundError, InternalError, NoDataError, InvalidInputError } = require('../AppError');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const getFileUrl = require('../utils/getFileUrl');

//  get all buildings by managername
exports.getAll = async (userId) => {
	const userObjectId = new mongoose.Types.ObjectId(userId);
	const buildings = await Services.buildings.getAllByManagementId(userObjectId);
	if (!buildings || buildings.length === 0) throw new NotFoundError('Không tìm thấy tòa nhà');
	return buildings;
};

exports.getBillCollectionProgress = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;

	const bills = await Services.buildings.getAllBills(buildingObjectId, currentMonth, currentYear);
	if (!bills) throw new NoDataError('Không có dữ liệu');
	return bills;
};

exports.getRooms = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
	const rooms = await Services.rooms.getAllRooms(buildingObjectId);

	return rooms;
};

exports.getListSelectingRoom = async (buildingId) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const rooms = await Services.buildings.getListSelectingRooms(buildingObjectId);
	return rooms;
};

exports.getCheckoutCosts = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	if (!month || !year) {
		const currentPeriod = await getCurrentPeriod(buildingId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	} else {
		Number(month);
		Number(year);
	}

	const result = await Services.checkoutCosts.getCheckoutCosts(buildingObjectId, month, year);

	return result;
};

exports.getStatistics = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	if (!month || !year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		month = currentPeriod.currentMonth;
		year = currentPeriod.currentYear;
	} else {
		Number(month);
		Number(year);
	}

	const statistics = await Entity.BuildingsEntity.aggregate(Pipelines.statistics.getStatisticsPipeline(buildingObjectId, month, year));

	if (statistics.length == 0) {
		throw new NoDataError(`Không có dữ liệu thống kê cho kỳ ${month}, ${year}`);
	}

	return { statistics: statistics[0].recentStatistics };
};

// owner only
exports.getBuildingPermissions = async (userId) => {
	const buildingSettings = await Entity.BuildingsEntity.find(
		{ 'management.user': userId },
		{ settings: 1, buildingName: 1, buildingAddress: 1, _id: 1 },
	);
	if (!buildingSettings || buildingSettings.length === 0) throw new NotFoundError('Tòa nhà không tồn tại!');
	// const response = buildingSettings.map((b) => b.settings);

	return buildingSettings;
};

// owner only
exports.setBuildingPermission = async (buildingId, type, enabled) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	const result = await Entity.BuildingsEntity.findOneAndUpdate({ _id: buildingObjectId }, { $set: { [`settings.${type}`]: enabled } });
	if (!result) throw new NotFoundError('Tòa nhà không tồn tại!');
	return 'Success';
};

exports.getStatisticGeneral = async (buildingId, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);
	if (!year) {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
		const { currentMonth, currentYear } = currentPeriod;
		year = currentYear;
	} else year = Number(year);

	const statistics = await Services.buildings.getStatisticGeneral(buildingObjectId, year);

	if (!statistics || statistics.length === 0) throw new NotFoundError('Dữ liệu khởi tạo không tồn tại');

	return statistics;
};

exports.getDepositTermFile = async (buildingId) => {
	const building = await Services.buildings.findById(buildingId).lean().exec();
	if (!building) throw NotFoundError('Dữ liệu không tồn tại');
	const depositTermFileUrl = await getFileUrl(building.depositTermUrl);
	return { depositTermFileUrl: depositTermFileUrl };
};
