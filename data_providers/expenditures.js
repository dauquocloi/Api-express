const mongoose = require('mongoose');
const MongoConnect = require('../utils/MongoConnect');
var Entity = require('../models');
const getCurrentPeriod = require('../utils/getCurrentPeriod');
const Pipelines = require('../service/aggregates');
const { BadRequestError, NotFoundError } = require('../AppError');
const Services = require('../service');

exports.getExpenditures = async (buildingId, month, year) => {
	const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

	const currentPeriod = await getCurrentPeriod(buildingObjectId);
	const { currentMonth, currentYear } = currentPeriod;
	if (!month || !year) {
		month = currentMonth;
		year = currentYear;

		const expenditures = await Services.expenditures.getExpendituresStatusUnLocked(buildingObjectId, month, year);
		const { incidentalExpenditures, periodicExpenditures } = expenditures;

		return { incidentalExpenditures, periodicExpenditures, period: { month: month, year: year }, status: 'unlock' };
	} else {
		month = parseInt(month);
		year = parseInt(year);

		if (month == currentMonth && year == currentYear) {
			const expenditures = await Services.expenditures.getExpendituresStatusUnLocked(buildingObjectId, month, year);

			const { incidentalExpenditures, periodicExpenditures } = expenditures;
			return { incidentalExpenditures, periodicExpenditures, period: { month: month, year: year }, status: 'unlock' };
		} else {
			const expenditureLocked = await Services.expenditures.getExpendituresStatusLocked(buildingObjectId, month, year);
			const { expenditures } = expenditureLocked;
			if (expenditures.length === 0)
				return { period: { month: month, year: year }, status: 'lock', incidentalExpenditures: [], periodicExpenditures: [] };

			let incidentalExpenditures = expenditures.filter((expenditure) => expenditure.type === 'incidental');
			let periodicExpenditures = expenditures.filter((expenditure) => expenditure.type === 'periodic');
			return { incidentalExpenditures, periodicExpenditures, period: { month: month, year: year }, status: 'lock' };
		}
	}
};

exports.createExpenditure = async (data) => {
	const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);
	const spenderObjectId = new mongoose.Types.ObjectId(data.spender);

	if (data.type == 'incidental') {
		const currentPeriod = await getCurrentPeriod(buildingObjectId);
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

		return newIncidentalExpenditure;
	} else if (data.type == 'periodic' || !data.type) {
		const newPeriodicExpenditure = new Entity.PeriodicExpendituresEntity({
			content: data.content,
			amount: data.amount,
			building: buildingObjectId,
		});
		const createPeriodicExpenditure = await newPeriodicExpenditure.save();

		return createPeriodicExpenditure;
	} else {
		throw new BadRequestError('Expenditure type invalid');
	}
};

exports.modifyExpenditure = async (data) => {
	const expenditureObjectId = new mongoose.Types.ObjectId(data.expenditureId);

	if (data.type === 'incidental') {
		const currentExpenditure = await Entity.ExpendituresEntity.findOne({ _id: expenditureObjectId });
		if (currentExpenditure == null) {
			throw new NotFoundError(`Khoản chi ${data.expenditureId} không tồn tại`);
		}

		const newExpenditure = {
			content: data.content,
			amount: data.amount,
			date: data.date,
			// spender: data.spender,
		};

		Object.assign(currentExpenditure, newExpenditure);

		const updatedExpenditure = await currentExpenditure.save();
		return updatedExpenditure;
	}
	if (data.type === 'periodic') {
		const currentExpenditure = await Entity.PeriodicExpendituresEntity.findOne({ _id: expenditureObjectId });
		if (currentExpenditure == null) {
			throw new NotFoundError(`Khoản chi ${data.expenditureId} không tồn tại`);
		}
		const newExpenditure = {
			content: data.content,
			amount: data.amount,
		};

		Object.assign(currentExpenditure, newExpenditure);

		const updatedExpenditure = await currentExpenditure.save();

		return updatedExpenditure;
	}

	throw new BadRequestError('Expenditure type invalid');
};

exports.deleteExpenditure = async (data) => {
	const expenditureObjectId = new mongoose.Types.ObjectId(data.expenditureId);
	if (data.type === 'incidental') {
		const deletedExpenditure = await Entity.ExpendituresEntity.findOneAndDelete({ _id: expenditureObjectId });
		if (deletedExpenditure === null) {
			throw new NotFoundError(`Không tìm thấy khoản chi với id: ${data.expenditureId} `);
		}
		return 'Success';
	} else if (data.type === 'periodic') {
		const deletedPeriodicExpenditure = await Entity.PeriodicExpendituresEntity.findOneAndDelete({ _id: expenditureObjectId });
		if (deletedPeriodicExpenditure === null) {
			throw new NotFoundError(`Không tìm thấy khoản chi với id: ${data.expenditureId} `);
		}
		return 'Success';
	} else {
		throw new BadRequestError('Expenditure type invalid');
	}
};

//========== UN REFACTORED ========== //

//====NOT USED====//
// exports.createPeriodicExpenditure = async (data, cb, next) => {
// 	try {
// 		const db = MongoConnect.Connect(config.database.fullname);
// 		const buildingObjectId = new mongoose.Types.ObjectId(data.buildingId);

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
