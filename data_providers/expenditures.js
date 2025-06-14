const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
// const { config } = require('dotenv');
const getCurrentPeriod = require('../utils/getCurrentPeriod');

// exports.createPeriodicExpenditure = async (data, cb, next) => {
// 	try {
// 		const db = MongoConnect.Connect(config.database.name);
// 		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);

// 		const newPeriodcExpenditure = new Entity.PeriodicExpendituresEntity({
// 			content: data.content,
// 			amount: data.amount,
// 			building: buildingObjectId,
// 		});
// 		const createPeriodicExpenditure = await newPeriodcExpenditure.save();

// 		cb(null, createPeriodicExpenditure);
// 	} catch (error) {
// 		next(error);
// 	}
// };

exports.createExpenditure = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const buildingObjectId = mongoose.Types.ObjectId(data.buildingId);
		const spenderObjectId = mongoose.Types.ObjectId(data.spender);

		if (data.type == 'incidental') {
			const currentPeriod = await getCurrentPeriod(buildingObjectId, next);
			const newIncidentalExpenditure = await Entity.ExpendituresEntity.create({
				month: currentPeriod.currentMonth,
				year: currentPeriod.currentYear,
				content: data.content,
				amount: data.amount,
				spender: spenderObjectId || null,
				type: 'incidental',
				building: buildingObjectId,
				date: data.date,
			});

			cb(null, newIncidentalExpenditure);
		} else if (data.type == 'periodic' || !data.type) {
			const newPeriodcExpenditure = new Entity.PeriodicExpendituresEntity({
				content: data.content,
				amount: data.amount,
				building: buildingObjectId,
			});
			const createPeriodicExpenditure = await newPeriodcExpenditure.save();

			cb(null, createPeriodicExpenditure);
		} else {
			throw new Error('Expenditure type invalid');
		}
	} catch (error) {
		next(error);
	}
};

exports.modifyExpenditure = async (data, cb, next) => {
	try {
		const db = MongoConnect.Connect(config.database.name);
		const expenditureObjectId = mongoose.Types.ObjectId(data.expenditureId);

		if (data.type == 'incidental') {
			const currentExpenditure = await Entity.ExpendituresEntity.findOne({ _id: expenditureObjectId });
			if (currentExpenditure == null) {
				throw new Error(`Khoản chi ${data.expenditureId} không tồn tại`);
			}

			const newExpenditure = {
				content: data.content,
				amount: data.amount,
				date: data.date,
				spender: data.spender,
			};

			Object.assign(currentExpenditure, newExpenditure);

			const updatedExpenditure = await updatedExpenditure.save();
			cb(null, updatedExpenditure);
		}
		if (data.type == 'periodic') {
			const currentExpenditure = await Entity.PeriodicExpendituresEntity.findOne({ _id: data.expenditureId });
			if (currentExpenditure == null) {
				throw new Error(`Khoản chi ${data.expenditureId} không tồn tại`);
			}
			const newExpenditure = {
				content: data.content,
				amount: data.amount,
			};

			Object.assign(currentExpenditure, newExpenditure);

			const updatedExpenditure = await currentExpenditure.save();

			cb(null, updatedExpenditure);
		}
	} catch (error) {
		next(error);
	}
};
