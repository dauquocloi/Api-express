const Entity = require('../models');
const MongoConnect = require('../utils/MongoConnect');
const mongoose = require('mongoose');
const AppError = require('./../AppError');

// very important !!!
const currentPeriod = async (buildingId) => {
	console.log('log of buildingId: ', buildingId);
	try {
		const statisticsStatusInfo = await Entity.StatisticsEntity.findOne({ building: buildingId }).sort({ year: -1, month: -1 }).exec();

		if (!statisticsStatusInfo) {
			throw new AppError(50001, `Dữ liệu thống kê ban đầu chưa được khởi tạo !${buildingId}`, 200);
		}

		const { month, year } = statisticsStatusInfo;

		let currentPeriod = {};
		if (statisticsStatusInfo.statisticsStatus == 'lock') {
			if (month === 12) {
				currentPeriod.currentMonth = 1;
				currentPeriod.currentYear = year + 1;
			} else {
				currentPeriod.currentMonth = month + 1;
				currentPeriod.currentYear = year;
			}
		}
		if (statisticsStatusInfo.statisticsStatus === 'unLock') {
			currentPeriod.currentMonth = month;
			currentPeriod.currentYear = year;
		}

		return currentPeriod;
	} catch (error) {
		next(error);
	}
};

module.exports = currentPeriod;
