const Entity = require('../models');
const MongoConnect = require('../utils/MongoConnect');
const mongoose = require('mongoose');

// very important !!!
const currentPeriod = async (buildingId) => {
	console.log('log of buildingId: ', buildingId);
	try {
		const statisticsStatusInfo = await Entity.StatisticsEntity.findOne({ building: buildingId }).sort({ year: -1, month: -1 }).exec();

		if (!statisticsStatusInfo) {
			throw new Error(`Dữ liệu thống kê ban đầu chưa được khởi tạo !${buildingId}`);
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
		throw new Error(`Dữ liệu thống kê ban đầu chưa được khởi tạo. Mã tòa nhà: ${buildingId}`);
	}
};

module.exports = currentPeriod;
